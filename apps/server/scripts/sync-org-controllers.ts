/**
 * Batch re-sync org controllers on-chain after registry redeploy / relayer pool migration.
 *
 * Usage: bun run --cwd apps/server scripts/sync-org-controllers.ts
 */
import { syncOrgControllersOnChain } from "@/lib/domains/orgs/controllers";
import db from "@/lib/platform/db";
import { logger } from "@/lib/platform/pino";

const { organizations } = db.schema;

async function main() {
	const rows = await db
		.select({ id: organizations.id, slug: organizations.slug })
		.from(organizations);

	let synced = 0;
	let failed = 0;

	for (const org of rows) {
		try {
			await syncOrgControllersOnChain(org.id);
			synced += 1;
			logger.info(
				{ organizationId: org.id, slug: org.slug },
				"synced org controllers",
			);
		} catch (err) {
			failed += 1;
			logger.error(
				{ err, organizationId: org.id, slug: org.slug },
				"sync org controllers failed",
			);
		}
	}

	logger.info(
		{ total: rows.length, synced, failed },
		"org controller re-sync finished",
	);
	if (failed > 0) {
		process.exitCode = 1;
	}
}

main().catch((err) => {
	logger.error({ err }, "sync-org-controllers script failed");
	process.exit(1);
});
