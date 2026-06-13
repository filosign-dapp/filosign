import "@/lib/platform/polyfills/bigint-json";
import { warnIfSesMisconfigured } from "@/lib/platform/email";

warnIfSesMisconfigured();

import { Hono } from "hono";
import { cors } from "hono/cors";
import config from "@/config";
import {
	captureServerException,
	shouldCaptureServerException,
} from "@/lib/platform/analytics";
import {
	bootstrapPlatformRuntime,
	shutdownPlatformRuntime,
} from "@/lib/platform/bootstrap/runtime";
import { csp } from "@/lib/platform/csp";
import { logger, requestLog } from "@/lib/platform/pino";
import {
	getServerRole,
	runsHttpServer,
	runsWorkerTasks,
} from "@/lib/platform/role";
import { handleCheckoutContinueRequest } from "./api/integrations/checkout-continue";
import { apiRouter } from "./api/orpc/hono-mount";

/** True after bootstrap + cache init; gates HTTP until ready. */
let bootstrapReady = false;

const bootstrapFailedResponse = () =>
	new Response(JSON.stringify({ ok: false, status: "bootstrap_failed" }), {
		status: 503,
		headers: { "Content-Type": "application/json" },
	});

const wrongRoleResponse = () =>
	new Response(
		JSON.stringify({
			ok: false,
			status: "wrong_server_role",
			role: getServerRole(),
		}),
		{
			status: 503,
			headers: { "Content-Type": "application/json" },
		},
	);

const bootstrapPromise = (async () => {
	if (!runsHttpServer()) return;
	try {
		await bootstrapPlatformRuntime({
			crons: runsWorkerTasks(),
			heartbeat: false,
		});
		bootstrapReady = true;
	} catch (err) {
		console.error("Server bootstrap failed:", err);
		process.exit(1);
	}
})();

export const app = new Hono()
	.use(async (_c, next) => {
		if (!runsHttpServer()) {
			return wrongRoleResponse();
		}
		if (!bootstrapReady) {
			await bootstrapPromise;
		}
		if (!bootstrapReady) {
			return bootstrapFailedResponse();
		}
		await next();
	})
	.use(requestLog)
	.use(cors(config.http.cors))
	.use(csp)
	.get("/", (c) => c.text("OK"))
	.get("/health", (c) => {
		if (!runsHttpServer()) {
			return c.json({ ok: false, status: "wrong_server_role" }, 503);
		}
		if (!bootstrapReady) {
			return c.json({ ok: false, status: "starting" }, 503);
		}
		return c.json({ ok: true });
	})
	.get("/checkout/continue", async (c) => {
		const token = c.req.query("token");
		return handleCheckoutContinueRequest({ token });
	})
	.route("/api", apiRouter)
	.onError((err, c) => {
		if (shouldCaptureServerException(err)) {
			captureServerException(err, {
				path: c.req.path,
				method: c.req.method,
			});
		}
		logger.error({ err }, "Unhandled HTTP error");
		return c.json({ ok: false, error: "Internal Server Error" }, 500);
	});

let shuttingDown = false;

async function shutdown(): Promise<void> {
	if (shuttingDown) return;
	shuttingDown = true;
	await shutdownPlatformRuntime({
		crons: runsWorkerTasks(),
		heartbeat: false,
	});
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		void shutdown().finally(() =>
			process.exit(signal === "SIGINT" ? 130 : 143),
		);
	});
}

async function gatedFetch(
	request: Request,
	server: Parameters<NonNullable<(typeof app)["fetch"]>>[1],
): Promise<Response> {
	if (!runsHttpServer()) {
		return wrongRoleResponse();
	}
	if (!bootstrapReady) {
		await bootstrapPromise;
	}
	if (!bootstrapReady) {
		return bootstrapFailedResponse();
	}
	return app.fetch(request, server);
}

/** Bun serve + `bun build --compile` entry (no top-level await - bytecode-safe). */
export default {
	port: config.http.port,
	fetch: gatedFetch,
};
