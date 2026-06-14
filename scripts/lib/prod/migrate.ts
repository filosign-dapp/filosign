import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProdContext } from "./context.ts";
import { createProdLog } from "./log.ts";
import {
	formatAppliedMigration,
	inferTagsForNewMigrations,
	listAppliedMigrations,
	newlyAppliedMigrations,
	pendingJournalTags,
	readMigrationJournal,
	resolveInfisicalDbName,
} from "./migrations.ts";
import { postgresContainerIp, withPostgresTunnel } from "./tunnel.ts";

const DRIZZLE_MIGRATE_SCRIPT = fileURLToPath(
	new URL("./drizzle-migrate-remote.ts", import.meta.url),
);

export async function migrateProd(
	root: string,
	opts?: { verbose?: boolean },
): Promise<number> {
	const verbose = opts?.verbose ?? true;
	const log = createProdLog(verbose);
	const ctx = createProdContext(root, { verbose, log });
	const server = path.join(root, "apps/server");

	log.section("Drizzle migrate - production");
	log.info(`ssh: ${ctx.ssh}`);
	log.info(`postgres container: ${ctx.containers.postgres}`);
	log.info(`postgres database: ${ctx.pgDb} (user ${ctx.pgUser})`);
	log.detail(
		"Set PROD_PG_DB in deploy/.env to match Infisical DB_NAME when not filosign",
	);

	const infisicalDbName = resolveInfisicalDbName(root);
	if (infisicalDbName) {
		log.info(`infisical DB_NAME: ${infisicalDbName}`);
		if (infisicalDbName !== ctx.pgDb) {
			log.fail(
				`probe database "${ctx.pgDb}" does not match Infisical DB_NAME "${infisicalDbName}". ` +
					`drizzle-kit migrate targets Infisical; migration counts probe deploy/.env PROD_PG_DB.`,
			);
			log.detail(
				`Set PROD_PG_DB=${infisicalDbName} in deploy/.env (see deploy/.env.example).`,
			);
			return 1;
		}
	} else {
		log.warn(
			"could not read Infisical DB_NAME (infisical login?). Probing PROD_PG_DB only.",
		);
	}

	let journal: ReturnType<typeof readMigrationJournal>;
	try {
		journal = readMigrationJournal(root);
		log.info(`local journal: ${journal.length} migration(s)`);
		log.detail(journal.map((entry) => `${entry.idx + 1}. ${entry.tag}`));
	} catch (error) {
		log.fail(
			`could not read apps/server/drizzle/meta/_journal.json: ${error instanceof Error ? error.message : String(error)}`,
		);
		return 1;
	}

	let beforeProbe: Awaited<ReturnType<typeof listAppliedMigrations>>;
	try {
		beforeProbe = await listAppliedMigrations(ctx);
	} catch (error) {
		log.fail(
			`could not read remote migrations: ${error instanceof Error ? error.message : String(error)}`,
		);
		return 1;
	}

	const before = beforeProbe.rows;
	const pending = pendingJournalTags(journal, before);

	log.info(`remote applied: ${before.length} migration(s)`);
	if (beforeProbe.journalMissing) {
		log.warn(
			`drizzle.__drizzle_migrations not found on "${ctx.pgDb}" (never migrated via drizzle-kit on this database, or wrong DB)`,
		);
	}
	if (before.length > 0) {
		log.detail(before.map(formatAppliedMigration));
	}
	if (pending.length === 0) {
		log.ok("database already up to date - nothing to apply");
		return 0;
	}
	log.info(`pending to apply: ${pending.length}`);
	log.detail(pending);

	let containerIp: string;
	try {
		containerIp = await postgresContainerIp(ctx);
		log.info(`postgres container ip: ${containerIp}`);
	} catch (error) {
		log.warn(
			`could not resolve container ip: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	log.section("Running drizzle-kit migrate");
	const code = await withPostgresTunnel(ctx, async (localPort) => {
		log.info(
			`tunnel: 127.0.0.1:${localPort} → ${ctx.containers.postgres}:5432`,
		);
		const proc = Bun.spawn({
			cmd: [
				"infisical",
				"run",
				"--env=prod",
				"--path=/app",
				"--",
				"bun",
				DRIZZLE_MIGRATE_SCRIPT,
			],
			cwd: root,
			stdout: "inherit",
			stderr: "inherit",
			env: {
				...process.env,
				PROD_PG_LOCAL_PORT: String(localPort),
				PROD_SERVER_DIR: server,
				PROD_TARGET_DB: ctx.pgDb,
				PROD_MIGRATE_EXPECTED_COUNT: String(journal.length),
				PROD_SSH_PROBE_COUNT: String(before.length),
			},
		});
		return (await proc.exited) ?? 1;
	});

	if (code !== 0) {
		log.fail(`drizzle-kit migrate exited with code ${code}`);
		return code;
	}

	let afterProbe: Awaited<ReturnType<typeof listAppliedMigrations>>;
	try {
		afterProbe = await listAppliedMigrations(ctx);
	} catch (error) {
		log.warn(
			`migrate succeeded but could not re-read remote migrations: ${error instanceof Error ? error.message : String(error)}`,
		);
		log.ok("drizzle-kit migrate finished");
		return 0;
	}

	const after = afterProbe.rows;
	const appliedTags = inferTagsForNewMigrations(journal, before, after);
	const newRows = newlyAppliedMigrations(before, after);
	const delta = after.length - before.length;

	log.section("Migrate result");
	log.info(
		`remote applied: ${after.length} migration(s) (${delta >= 0 ? `+${delta}` : delta})`,
	);
	if (appliedTags.length > 0) {
		log.ok(`newly applied: ${appliedTags.join(", ")}`);
		log.detail(
			appliedTags.map((tag, i) => {
				const row = newRows[i];
				return row ? `${tag} - ${formatAppliedMigration(row)}` : tag;
			}),
		);
	} else if (delta === 0 && pending.length > 0) {
		log.fail(
			`drizzle-kit reported success but "${ctx.pgDb}" still shows ${after.length} journal row(s) after ${pending.length} pending migration(s). ` +
				`See [drizzle-migrate] logs: tunnel may not reach VPS Postgres (local port 5433 in use, or SSH tunnel failed).`,
		);
		if (infisicalDbName && infisicalDbName !== ctx.pgDb) {
			log.detail(
				`Infisical DB_NAME=${infisicalDbName}, probe PROD_PG_DB=${ctx.pgDb}`,
			);
		}
		return 1;
	} else if (delta === 0) {
		log.ok("no new rows in drizzle.__drizzle_migrations (already up to date)");
	}

	log.ok("migrate complete");
	return 0;
}
