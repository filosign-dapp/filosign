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
	log.detail(`server dir: ${server}`);

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

	let before: Awaited<ReturnType<typeof listAppliedMigrations>>;
	try {
		before = await listAppliedMigrations(ctx);
	} catch (error) {
		log.fail(
			`could not read remote migrations: ${error instanceof Error ? error.message : String(error)}`,
		);
		return 1;
	}

	const pending = pendingJournalTags(journal, before);
	log.info(`remote applied: ${before.length} migration(s)`);
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
			},
		});
		return (await proc.exited) ?? 1;
	});

	if (code !== 0) {
		log.fail(`drizzle-kit migrate exited with code ${code}`);
		return code;
	}

	let after: Awaited<ReturnType<typeof listAppliedMigrations>>;
	try {
		after = await listAppliedMigrations(ctx);
	} catch (error) {
		log.warn(
			`migrate succeeded but could not re-read remote migrations: ${error instanceof Error ? error.message : String(error)}`,
		);
		log.ok("drizzle-kit migrate finished");
		return 0;
	}

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
	} else if (delta === 0) {
		log.ok("no new rows in drizzle.__drizzle_migrations (already up to date)");
	} else {
		log.detail(newRows.map(formatAppliedMigration));
	}

	log.ok("migrate complete");
	return 0;
}
