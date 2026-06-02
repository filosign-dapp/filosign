import { logger } from "@/lib/platform/pino";
import { enqueueClaimedOutboxRows } from "./outbox-enqueue";
import { claimOutboxBatch } from "./outbox-store";

const DRAIN_INTERVAL_MS = 15_000;
const DRAIN_BATCH_SIZE = 50;

let drainTimer: ReturnType<typeof setInterval> | null = null;

export async function runOutboxDrainerTick(): Promise<number> {
	const claimed = await claimOutboxBatch(DRAIN_BATCH_SIZE);
	if (claimed.length === 0) return 0;
	const enqueued = await enqueueClaimedOutboxRows(claimed);
	logger.debug({ claimed: claimed.length, enqueued }, "outbox drainer tick");
	return enqueued;
}

export function startOutboxDrainer(): void {
	if (drainTimer) return;
	drainTimer = setInterval(() => {
		void runOutboxDrainerTick().catch((err) => {
			logger.error({ err }, "outbox drainer tick failed");
		});
	}, DRAIN_INTERVAL_MS);
}

export function stopOutboxDrainer(): void {
	if (drainTimer) {
		clearInterval(drainTimer);
		drainTimer = null;
	}
}
