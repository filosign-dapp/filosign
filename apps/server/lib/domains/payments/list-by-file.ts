import type { PaymentRuleStatus } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import db from "@/lib/platform/db";

const { filePaymentRules } = db.schema;

export async function paymentsListByFile(
	userWallet: `0x${string}`,
	pieceCid: string,
) {
	const rows = await db
		.select()
		.from(filePaymentRules)
		.where(eq(filePaymentRules.pieceCid, pieceCid));

	if (rows.length === 0) return [];

	const [file] = await db
		.select({ sender: db.schema.files.sender })
		.from(db.schema.files)
		.where(eq(db.schema.files.pieceCid, pieceCid))
		.limit(1);

	if (!file) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}

	const isSender = file.sender.toLowerCase() === userWallet.toLowerCase();
	const isParticipant = await db
		.select({ wallet: db.schema.fileParticipants.wallet })
		.from(db.schema.fileParticipants)
		.where(eq(db.schema.fileParticipants.filePieceCid, pieceCid));

	const canView =
		isSender ||
		isParticipant.some(
			(p) => p.wallet.toLowerCase() === userWallet.toLowerCase(),
		);

	if (!canView) {
		throw new ORPCError("FORBIDDEN", {
			message: "Not allowed to view payouts",
		});
	}

	return rows.map((r) => ({
		id: r.id,
		onChainRuleId: r.onChainRuleId.toString(),
		recipientWallet: r.recipientWallet,
		recipientSource: r.recipientSource,
		amount: r.amount,
		tokenAddress: r.tokenAddress,
		releaseType: r.releaseType,
		status: r.status,
		payoutTxHash: r.payoutTxHash ?? null,
		lastError: r.lastError ?? null,
		executedAt: r.executedAt?.toISOString() ?? null,
	}));
}

export async function paymentsRequestRetry(
	userWallet: `0x${string}`,
	onChainRuleId: string,
) {
	const ruleId = BigInt(onChainRuleId);
	const [rule] = await db
		.select()
		.from(filePaymentRules)
		.where(eq(filePaymentRules.onChainRuleId, ruleId))
		.limit(1);

	if (!rule) {
		throw new ORPCError("NOT_FOUND", { message: "Payment rule not found" });
	}

	const [file] = await db
		.select({ sender: db.schema.files.sender })
		.from(db.schema.files)
		.where(eq(db.schema.files.pieceCid, rule.pieceCid))
		.limit(1);

	if (!file) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}

	if (file.sender.toLowerCase() !== userWallet.toLowerCase()) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the file sender can retry payouts",
		});
	}

	const retriable: PaymentRuleStatus[] = [
		"failed_insufficient",
		"failed_gas_tank",
		"failed_conditions",
	];

	if (!retriable.includes(rule.status)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Only failed payout rules can be retried",
		});
	}

	await db
		.update(filePaymentRules)
		.set({
			status: "pending",
			lastError: null,
			updatedAt: new Date(),
		})
		.where(eq(filePaymentRules.onChainRuleId, ruleId));

	return { ok: true as const, onChainRuleId };
}
