import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { zSettlementRuleRegistrationInput } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { getAddress } from "viem";
import z from "zod";
import db from "@/lib/platform/db";

const { fileSettlementRules, organizations } = db.schema;

export const zSettlementRulesRegisterBatch = z.array(
	zSettlementRuleRegistrationInput,
);

export { assertSettlementRulesVerifiedOnChain } from "./utils/verify-rules-on-chain";

type DbExecutor =
	| typeof db
	| Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function insertSettlementRulesForFile(
	pieceCid: string,
	payerWallet: `0x${string}`,
	rules: z.infer<typeof zSettlementRulesRegisterBatch>,
	executor: DbExecutor = db,
) {
	if (rules.length === 0) return;

	await executor.insert(fileSettlementRules).values(
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

function norm(addr: string) {
	return getAddress(addr).toLowerCase();
}

export async function assertSettlementRecipientsAllowlisted(args: {
	participantWallets: `0x${string}`[];
	organizationId?: string;
	rules: SettlementRuleRegistrationInput[];
}) {
	if (args.rules.length === 0) return;

	const allowed = new Set(args.participantWallets.map((w) => norm(w)));

	let orgWallet: `0x${string}` | null = null;
	if (args.organizationId) {
		const [org] = await db
			.select({ orgWalletAddress: organizations.orgWalletAddress })
			.from(organizations)
			.where(eq(organizations.id, args.organizationId))
			.limit(1);

		if (org?.orgWalletAddress) {
			orgWallet = getAddress(org.orgWalletAddress);
			allowed.add(norm(orgWallet));
		}
	}

	for (const rule of args.rules) {
		const recipient = norm(rule.recipientWallet);

		if (!allowed.has(recipient)) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"Settlement recipient must be an envelope participant or the organization payout wallet",
			});
		}

		if (rule.recipientSource === "org_wallet") {
			if (!orgWallet || recipient !== norm(orgWallet)) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Organization payout wallet is not linked or does not match",
				});
			}
			continue;
		}

		if (
			rule.recipientSource === "signer" ||
			rule.recipientSource === "viewer"
		) {
			if (!args.participantWallets.some((w) => norm(w) === recipient)) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Settlement recipient must be on this envelope",
				});
			}
		}
	}
}
