import { zPaymentRuleRegistrationInput } from "@filosign/shared";
import z from "zod";
import db from "@/lib/platform/db";

const { filePaymentRules } = db.schema;

type DbExecutor =
	| typeof db
	| Parameters<Parameters<typeof db.transaction>[0]>[0];

export const zPaymentRulesRegisterBatch = z.array(
	zPaymentRuleRegistrationInput,
);

export async function insertPaymentRulesForFile(
	pieceCid: string,
	payerWallet: `0x${string}`,
	rules: z.infer<typeof zPaymentRulesRegisterBatch>,
	executor: DbExecutor = db,
) {
	if (rules.length === 0) return;

	await executor.insert(filePaymentRules).values(
		rules.map((r) => ({
			pieceCid,
			onChainRuleId: BigInt(r.onChainRuleId),
			cidIdentifier: r.cidIdentifier,
			payerWallet,
			recipientWallet: r.recipientWallet,
			recipientSource: r.recipientSource,
			tokenAddress: r.tokenAddress,
			amount: r.amount,
			releaseType: r.releaseType,
			releaseParams: r.releaseParams,
			status: "pending" as const,
			registerRuleTxHash: r.registerRuleTxHash,
			approveTxHash: r.approveTxHash,
		})),
	);
}
