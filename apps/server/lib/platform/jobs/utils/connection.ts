import IORedis from "ioredis";
import env from "@/env";

let queueConnection: IORedis | null = null;
let workerConnection: IORedis | null = null;

function createConnection(): IORedis {
	return new IORedis(env.DRAGONFLY_URL, {
		maxRetriesPerRequest: null,
		enableReadyCheck: true,
	});
}

/** Producer connection (API + worker drainer). */
export function getQueueConnection(): IORedis {
	if (!queueConnection) {
		queueConnection = createConnection();
	}
	return queueConnection;
}

/** Dedicated blocking connection for BullMQ workers. */
export function getWorkerConnection(): IORedis {
	if (!workerConnection) {
		workerConnection = createConnection();
	}
	return workerConnection;
}

export async function closeJobConnections(): Promise<void> {
	const closes: Promise<unknown>[] = [];
	if (queueConnection) {
		closes.push(queueConnection.quit());
		queueConnection = null;
	}
	if (workerConnection) {
		closes.push(workerConnection.quit());
		workerConnection = null;
	}
	await Promise.all(closes);
}
