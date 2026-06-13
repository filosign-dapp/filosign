/**
 * Minimal worker container health probe - no `@/env` (Docker HEALTHCHECK does not run Infisical).
 * Requires only `DRAGONFLY_URL` from compose / runtime env.
 */
import { RedisClient } from "bun";

const WORKER_HEARTBEAT_KEY = "fs:worker:heartbeat";
const MAX_AGE_MS = 90_000;

async function main(): Promise<void> {
	const dragonflyUrl = Bun.env.DRAGONFLY_URL?.trim();
	if (!dragonflyUrl) {
		process.exit(1);
	}

	const redis = new RedisClient(dragonflyUrl);
	try {
		const raw = await redis.get(WORKER_HEARTBEAT_KEY);
		if (!raw) {
			process.exit(1);
		}
		const ts = Date.parse(raw);
		if (Number.isNaN(ts) || Date.now() - ts > MAX_AGE_MS) {
			process.exit(1);
		}
		process.exit(0);
	} catch {
		process.exit(1);
	}
}

void main();
