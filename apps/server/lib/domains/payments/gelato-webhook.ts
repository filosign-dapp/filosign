import type { PaymentRuleStatus } from "@filosign/shared";
import { eq } from "drizzle-orm";
import z from "zod";
import db from "@/lib/platform/db";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { filePaymentRules } = db.schema;

export const zGelatoWebhookBody = z.object({
	kind: z.enum(["success", "fail"]),
	reason: z.string().optional(),
	transactionHash: z.string().nullable().optional(),
	onChainRuleId: z.string().optional(),
	cidId: z.string().optional(),
});

export type GelatoWebhookBody = z.infer<typeof zGelatoWebhookBody>;

const PENDING_RULES_LIMIT = 50;

function mapGelatoReasonToStatus(
	reason: string | undefined,
): PaymentRuleStatus {
	if (!reason) return "failed_conditions";
	if (reason === "InsufficientFunds" || reason === "ExecutionReverted") {
		return "failed_insufficient";
	}
	if (reason === "SimulationFailed") return "failed_insufficient";
	return "failed_conditions";
}

export async function applyGelatoPayoutWebhook(body: GelatoWebhookBody) {
	const { kind, reason, transactionHash, onChainRuleId } = body;
	if (!onChainRuleId) return;

	const ruleId = BigInt(onChainRuleId);
	if (kind === "success" && transactionHash) {
		const res = await tryCatch(
			db
				.update(filePaymentRules)
				.set({
					status: "executed",
					payoutTxHash: transactionHash as `0x${string}`,
					executedAt: new Date(),
					lastError: null,
					updatedAt: new Date(),
				})
				.where(eq(filePaymentRules.onChainRuleId, ruleId)),
		);
		if (res.error) throw res.error;
	} else if (kind === "fail") {
		const res = await tryCatch(
			db
				.update(filePaymentRules)
				.set({
					status: mapGelatoReasonToStatus(reason),
					lastError: reason ?? "unknown",
					updatedAt: new Date(),
				})
				.where(eq(filePaymentRules.onChainRuleId, ruleId)),
		);
		if (res.error) throw res.error;
	}
}

export async function listPendingRulesForGelato(limit = PENDING_RULES_LIMIT) {
	const rows = await db
		.select({
			onChainRuleId: filePaymentRules.onChainRuleId,
			cidIdentifier: filePaymentRules.cidIdentifier,
		})
		.from(filePaymentRules)
		.where(eq(filePaymentRules.status, "ready"))
		.limit(limit);

	return rows.map((r) => ({
		onChainRuleId: r.onChainRuleId.toString(),
		cidId: r.cidIdentifier,
	}));
}
