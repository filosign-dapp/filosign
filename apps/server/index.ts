import "@/lib/platform/polyfills/bigint-json";
import { Hono } from "hono";
import { cors } from "hono/cors";
import config from "@/config";
import { shutdownPostHog } from "@/lib/platform/analytics/posthog";
import { startPlatformCron, stopPlatformCron } from "@/lib/platform/cron";
import { csp } from "@/lib/platform/csp";
import { requestLog } from "@/lib/platform/pino";
import { apiRouter } from "./api/orpc/hono-mount";

export const app = new Hono()
	.use(requestLog)
	.use(cors(config.http.cors))
	.use(csp)
	.get("/", (c) => c.text("OK"))
	.get("/health", (c) => c.json({ ok: true }))
	.route("/api", apiRouter);

const server = Bun.serve({
	port: config.http.port,
	fetch: app.fetch,
});

startPlatformCron();

let shuttingDown = false;

async function shutdown(): Promise<void> {
	if (shuttingDown) return;
	shuttingDown = true;
	stopPlatformCron();
	await shutdownPostHog();
	server.stop();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		void shutdown().finally(() =>
			process.exit(signal === "SIGINT" ? 130 : 143),
		);
	});
}
