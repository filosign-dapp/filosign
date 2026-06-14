import env from "@/env";
import { emitWorkerStaleAlert } from "@/lib/platform/analytics";
import { getRedis } from "@/lib/platform/cache/session";
import { runsHttpServer, runsWorkerTasks } from "@/lib/platform/role";
import { checkWorkerHeartbeatFresh, WORKER_HEARTBEAT_KEY } from "./heartbeat";

const MONITOR_INTERVAL_MS = 60_000;
const STALE_AFTER_MS = 90_000;
const MONITOR_START_GRACE_MS = 3 * 60 * 1000;

let monitorTimer: ReturnType<typeof setInterval> | null = null;
let workerWasStale = false;
let monitorStartedAt = 0;

export function shouldRunWorkerLivenessMonitor(): boolean {
	return (
		runsHttpServer() &&
		!runsWorkerTasks() &&
		env.DEPLOYMENT !== "local" &&
		env.TG_ANALYTICS
	);
}

async function readWorkerHeartbeatAgeMs(): Promise<{
	fresh: boolean;
	lastHeartbeatAt: string | null;
	ageMs: number | null;
}> {
	const raw = await getRedis().get(WORKER_HEARTBEAT_KEY);
	if (!raw) {
		return { fresh: false, lastHeartbeatAt: null, ageMs: null };
	}
	const ts = Date.parse(raw);
	if (Number.isNaN(ts)) {
		return { fresh: false, lastHeartbeatAt: raw, ageMs: null };
	}
	const ageMs = Date.now() - ts;
	return {
		fresh: ageMs <= STALE_AFTER_MS,
		lastHeartbeatAt: raw,
		ageMs,
	};
}

async function pollWorkerLiveness(): Promise<void> {
	if (Date.now() - monitorStartedAt < MONITOR_START_GRACE_MS) {
		return;
	}

	const fresh = await checkWorkerHeartbeatFresh(STALE_AFTER_MS);
	if (fresh) {
		workerWasStale = false;
		return;
	}

	if (workerWasStale) return;

	const heartbeat = await readWorkerHeartbeatAgeMs();
	workerWasStale = true;
	await emitWorkerStaleAlert({
		lastHeartbeatAt: heartbeat.lastHeartbeatAt,
		staleForSec:
			heartbeat.ageMs != null
				? Math.round(heartbeat.ageMs / 1000)
				: STALE_AFTER_MS / 1000,
	});
}

export function startWorkerLivenessMonitor(): void {
	if (!shouldRunWorkerLivenessMonitor() || monitorTimer) return;
	monitorStartedAt = Date.now();
	void pollWorkerLiveness();
	monitorTimer = setInterval(() => {
		void pollWorkerLiveness().catch(() => {
			// Redis blip; next tick retries
		});
	}, MONITOR_INTERVAL_MS);
}

export function stopWorkerLivenessMonitor(): void {
	if (!monitorTimer) return;
	clearInterval(monitorTimer);
	monitorTimer = null;
	workerWasStale = false;
}

export function resetWorkerLivenessMonitorForTests(): void {
	stopWorkerLivenessMonitor();
	workerWasStale = false;
	monitorStartedAt = 0;
}
