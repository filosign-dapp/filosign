#!/usr/bin/env bun
/**
 * Production VPS ops from laptop (FILOSIGN_PROD_SSH in deploy/.env).
 *
 *   bun run prod              all services, health (default)
 *   bun run prod -- --pg --info
 *   bun run prod -- --migrate
 *   bun run prod -- --help
 */

import { runMain, scriptArgv, wantsHelp } from "./lib/cli.ts";
import { createProdContext } from "./lib/prod/context.ts";
import { migrateProd } from "./lib/prod/migrate.ts";
import { parseProdArgv } from "./lib/prod/parse.ts";
import { runMany } from "./lib/prod/run.ts";
import { repoRoot } from "./lib/root.ts";

const HELP = `
Filosign production (laptop → VPS via SSH)

  bun run prod              Default: --all --health

Targets (one or more, or --all):
  --pg         Postgres (pg_isready, psql metrics)
  --pgbackup   pgBackRest in postgres container (check / info)
  --dfly       Redis PING + INFO
  --api        GET /health inside container
  --worker     worker-healthcheck + heartbeat key
  --all        All five targets

Actions (one per run):
  --health     Container + deep probe (default when targets only)
  --info       Metrics / status output
  --migrate    Drizzle migrate (SSH tunnel + Infisical prod /app)
  --quiet, -q  Less output (default is verbose)

Examples:
  bun run prod
  bun run prod -- --pgbackup --info
  bun run prod -- --pg --dfly --health
  bun run prod -- --migrate
`.trim();

runMain(async () => {
	const argv = scriptArgv();
	if (wantsHelp(argv)) {
		console.log(HELP);
		process.exit(0);
	}
	const root = repoRoot(import.meta.url);
	const parsed = parseProdArgv(argv);

	if (parsed.kind === "migrate") {
		process.exit(await migrateProd(root, { verbose: parsed.verbose }));
	}

	const ctx = createProdContext(root, { verbose: parsed.verbose });
	process.exit(await runMany(ctx, parsed.targets, parsed.action));
});
