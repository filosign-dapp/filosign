import type { Context, Next } from "hono";
import env from "@/env";

/** Shared-secret gate for Gelato integration routes (no user JWT). */
export async function gelatoWebhookSecret(c: Context, next: Next) {
	const secret = env.GELATO_WEBHOOK_SECRET;
	if (!secret) {
		return c.json({ error: "Webhook not configured" }, 503);
	}
	if (c.req.header("X-Gelato-Webhook-Secret") !== secret) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	await next();
}
