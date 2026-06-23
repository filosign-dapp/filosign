import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
	captureServerException,
	shouldCaptureServerException,
} from "@/lib/platform/analytics";
import { handlePimlicoProxyRequest } from "@/lib/platform/pimlico-proxy";
import { resolveClientIpFromRequest } from "@/lib/platform/utils/client-ip";

export const pimlicoProxyRouter = new Hono().post(
	"/integrations/pimlico/v2/:chainId/rpc",
	async (c) => {
		try {
			const body = await c.req.json();
			const result = await handlePimlicoProxyRequest({
				chainIdParam: c.req.param("chainId"),
				origin: c.req.header("origin"),
				referer: c.req.header("referer"),
				body,
				clientIp: resolveClientIpFromRequest(c.req),
			});

			c.status(result.httpStatus as ContentfulStatusCode);
			c.header("Content-Type", "application/json");
			return c.body(result.bodyText);
		} catch (error) {
			if (shouldCaptureServerException(error)) {
				captureServerException(error, {
					path: c.req.path,
					method: c.req.method,
					source: "integrations.pimlico.proxy",
				});
			}
			c.status(500);
			return c.json({
				jsonrpc: "2.0",
				id: null,
				error: {
					code: -32603,
					message: "Unexpected proxy processing error",
				},
			});
		}
	},
);
