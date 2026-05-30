import { dodoLive } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import DodoPayments from "dodopayments";
import env from "@/env";

export function requireDodoApiKey(): string {
	if (!env.DODO_API_KEY) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Dodo Payments is not configured",
		});
	}
	return env.DODO_API_KEY;
}

export function createDodoClient(options?: { includeWebhookKey?: boolean }) {
	return new DodoPayments({
		bearerToken: requireDodoApiKey(),
		...(options?.includeWebhookKey !== false && env.DODO_WEBHOOK_KEY
			? { webhookKey: env.DODO_WEBHOOK_KEY }
			: {}),
		environment: dodoLive(env.DEPLOYMENT) ? "live_mode" : "test_mode",
	});
}
