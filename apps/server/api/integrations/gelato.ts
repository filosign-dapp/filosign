import { Hono } from "hono";
import {
	applyGelatoPayoutWebhook,
	listPendingRulesForGelato,
	zGelatoWebhookBody,
} from "@/lib/domains/payments";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { gelatoWebhookSecret } from "./gelato-secret";

export const gelatoRouter = new Hono()
	.use("*", gelatoWebhookSecret)
	.post("/payout", async (c) => {
		const parsed = zGelatoWebhookBody.safeParse(await c.req.json());
		if (!parsed.success) {
			return c.json({ error: parsed.error.message }, 400);
		}

		const res = await tryCatch(applyGelatoPayoutWebhook(parsed.data));
		if (res.error) {
			return c.json({ error: "Webhook processing failed" }, 500);
		}

		return c.json({ ok: true });
	})
	.get("/pending-rules", async (c) => {
		const rules = await listPendingRulesForGelato();
		return c.json({ rules });
	});
