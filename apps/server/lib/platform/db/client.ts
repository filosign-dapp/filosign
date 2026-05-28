import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import env from "@/env";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import { emitCriticalPlatformEvent } from "@/lib/platform/analytics/platform-alerts";
import { logger } from "@/lib/platform/pino";
import schema from "./schema";

const pool = new Pool({
	connectionString: env.PG_URI.replace(":dbname", env.DB_NAME),
});

export function handlePoolError(err: unknown): void {
	const error = err instanceof Error ? err.message : String(err);
	logger.error({ err }, "postgres pool error");
	void emitCriticalPlatformEvent({
		name: PLATFORM_ALERT_EVENTS.serverDbInfraError,
		severity: "critical",
		message: "Postgres pool infrastructure error",
		context: {
			source: "pg_pool",
			error,
		},
	});
}

pool.on("error", handlePoolError);

const dbClient = drizzle({ client: pool, schema, casing: "snake_case" });

export default dbClient;
