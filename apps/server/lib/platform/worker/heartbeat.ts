import { getRedis } from "@/lib/platform/cache/session";

export const WORKER_HEARTBEAT_KEY = "fs:worker:heartbeat";
export const WORKER_HEARTBEAT_TTL_SEC = 60;
const HEARTBEAT_INTERVAL_MS = 20_000;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export async function writeWorkerHeartbeat(): Promise<void> {
	const payload = new Date().toISOString();
	await getRedis().send("SET", [
		WORKER_HEARTBEAT_KEY,
		payload,
		"EX",
		String(WORKER_HEARTBEAT_TTL_SEC),
	]);
}

export function startWorkerHeartbeat(): void {
	if (heartbeatTimer) return;
	void writeWorkerHeartbeat();
	heartbeatTimer = setInterval(() => {
		void writeWorkerHeartbeat();
	}, HEARTBEAT_INTERVAL_MS);
}

export function stopWorkerHeartbeat(): void {
	if (!heartbeatTimer) return;
	clearInterval(heartbeatTimer);
	heartbeatTimer = null;
}

/** Docker healthcheck: heartbeat present and younger than 90s. */
export async function checkWorkerHeartbeatFresh(
	maxAgeMs = 90_000,
): Promise<boolean> {
	const raw = await getRedis().get(WORKER_HEARTBEAT_KEY);
	if (!raw) return false;
	const ts = Date.parse(raw);
	if (Number.isNaN(ts)) return false;
	return Date.now() - ts <= maxAgeMs;
}
