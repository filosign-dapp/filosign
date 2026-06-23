import { ORPCError } from "@orpc/server";
import { Hono } from "hono";
import { ackDodoWebhook } from "@/lib/domains/billing";
import {
	captureServerException,
	shouldCaptureServerException,
} from "@/lib/platform/analytics";
import { pimlicoProxyRouter } from "./pimlico-proxy";

/** Non-oRPC `/api/integrations/*` routes (webhooks, partner callbacks). */
export const integrationsRouter = new Hono()
	.route("/", pimlicoProxyRouter)
	.post("/integrations/dodo/webhook", async (c) => {
		try {
			const webhookId = c.req.header("webhook-id");
			const webhookTimestamp = c.req.header("webhook-timestamp");
			const webhookSignature = c.req.header("webhook-signature");

			if (!webhookId || !webhookTimestamp || !webhookSignature) {
				c.status(400);
				return c.json({
					ok: false,
					error: "Missing webhook signature headers",
				});
			}

			const rawBody = await c.req.raw.text();

			const result = await ackDodoWebhook({
				rawBody,
				webhookId,
				webhookTimestamp,
				webhookSignature,
			});

			return c.json(result);
		} catch (error) {
			if (error instanceof ORPCError) {
				const status =
					error.code === "UNAUTHORIZED"
						? 401
						: error.code === "BAD_REQUEST"
							? 400
							: 500;
				c.status(status);
				return c.json({
					ok: false,
					error: error.message,
				});
			}

			if (shouldCaptureServerException(error)) {
				captureServerException(error, {
					path: c.req.path,
					method: c.req.method,
					source: "integrations.dodo.webhook",
				});
			}
			c.status(500);
			return c.json({
				ok: false,
				error: "Unexpected webhook processing error",
			});
		}
	});
