/**
 * Emit Telegram/PostHog alert when pgBackRest wrapper exits non-zero.
 * Invoked from deploy/scripts/pgbackrest-backup.sh (host cron; uses process.env only).
 */
import {
	emitCriticalPlatformEventFromProcessEnv,
	PLATFORM_ALERT_EVENTS,
} from "@/lib/platform/analytics";

const stanza = process.argv[2] ?? process.env.PGBACKREST_STANZA ?? "filosign";
const cmd = process.argv[3] ?? "unknown";
const container =
	process.argv[4] ??
	process.env.PGBACKREST_CONTAINER ??
	"filosign-data-postgres-1";

await emitCriticalPlatformEventFromProcessEnv({
	name: PLATFORM_ALERT_EVENTS.serverPgbackrestFailed,
	severity: "critical",
	message: `pgBackRest ${cmd} failed (stanza=${stanza})`,
	context: { stanza, container, cmd },
});
