import { createPinoLogger } from "@filosign/logger";
import type { MiddlewareHandler } from "hono";
import env from "@/env";
import {
	emitCriticalPlatformEvent,
	PLATFORM_ALERT_EVENTS,
} from "@/lib/platform/analytics";

export const logger = createPinoLogger({
	debug: env.DEBUG,
	chain: env.CHAIN,
});

/** Log every HTTP request with pino (replaces `hono/logger`). */
export const requestLog: MiddlewareHandler = async (c, next) => {
	const start = performance.now();
	await next();
	const ms = Math.round(performance.now() - start);
	logger.info(`${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`);
	if (c.res.status >= 500) {
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverHttp500,
			severity: "critical",
			message: "HTTP request returned 5xx",
			context: {
				method: c.req.method,
				path: c.req.path,
				status: c.res.status,
				durationMs: ms,
			},
		});
	}
};
