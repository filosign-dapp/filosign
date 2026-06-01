import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { zSettlementRuleRegistrationInput } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { type Address, getAddress } from "viem";
import z from "zod";
import { resolveEntitlementContext } from "@/lib/domains/entitlements";
import db from "@/lib/platform/db";
import { fsContracts } from "@/lib/platform/evm";
import { assertSettlementRulesUsdcToken } from "./utils/assert-settlement-token";
import { assertSettlementRuleEntitlements } from "./utils/settlement-entitlements";
import { assertSettlementRulesVerifiedOnChain } from "./utils/verify-rules-on-chain";

const { fileSettlementRules, files, fileParticipants, organizations } =
	db.schema;

export const zSettlementRulesRegisterBatch = z.array(
	zSettlementRuleRegistrationInput,
);

export { assertSettlementRulesVerifiedOnChain };

type DbExecutor =
	| typeof db
	| Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function insertSettlementRulesForFile(
	pieceCid: string,
	payerWallet: `0x${string}`,
	rules: z.infer<typeof zSettlementRulesRegisterBatch>,
	validatorAddress: `0x${string}`,
	executor: DbExecutor = db,
) {
	if (rules.length === 0) return;

	await executor.insert(fileSettlementRules).values(
		rules.map((r) => {
			if (!r.legs[0]) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Settlement rule requires at least one payout leg",
				});
			}
			return {
				pieceCid,
				onChainRuleId: BigInt(r.onChainRuleId),
				cidIdentifier: r.cidIdentifier,
				payerWallet,
				tokenAddress: r.tokenAddress,
				legs: r.legs,
				expiresAt: r.expiresAt ?? null,
				releaseType: r.releaseType,
				releaseParams: r.releaseParams,
				validatorAddress,
				status: "pending" as const,
				registerRuleTxHash: r.registerRuleTxHash,
				approveTxHash: r.approveTxHash,
			};
		}),
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
		for (const leg of rule.legs) {
			const recipient = norm(leg.recipientWallet);

			if (!allowed.has(recipient)) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Settlement recipient must be an envelope participant or the organization payout wallet",
				});
			}

			if (leg.recipientSource === "org_wallet") {
				if (!orgWallet || recipient !== norm(orgWallet)) {
					throw new ORPCError("BAD_REQUEST", {
						message:
							"Organization payout wallet is not linked or does not match",
					});
				}
				continue;
			}

			if (
				leg.recipientSource === "signer" ||
				leg.recipientSource === "viewer"
			) {
				if (!args.participantWallets.some((w) => norm(w) === recipient)) {
					throw new ORPCError("BAD_REQUEST", {
						message: "Settlement recipient must be on this envelope",
					});
				}
			}
		}
	}
}

export async function settlementsRegisterForFile(
	sender: Address,
	rawBody: unknown,
) {
	const parsed = z
		.object({
			pieceCid: z.string().min(1),
			organizationId: z.uuid().optional(),
			rules: zSettlementRulesRegisterBatch.min(1),
		})
		.safeParse(rawBody);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	const { pieceCid, organizationId, rules } = parsed.data;
	const [file] = await db
		.select({
			sender: files.sender,
			organizationId: files.organizationId,
			registryAddress: files.registryAddress,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);
	if (!file) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}
	if (getAddress(file.sender) !== getAddress(sender)) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the sender can attach settlement rules",
		});
	}

	const entitlementCtx = await resolveEntitlementContext(
		getAddress(sender),
		organizationId ?? file.organizationId ?? null,
	);
	const orgId = organizationId ?? file.organizationId ?? null;
	for (const rule of rules) {
		await assertSettlementRuleEntitlements(
			entitlementCtx,
			rule,
			orgId,
			getAddress(sender),
		);
	}
	assertSettlementRulesUsdcToken(rules);

	const validatorAddress = getAddress(fsContracts.FSPaymentValidator.address);

	const participantRows = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(eq(fileParticipants.filePieceCid, pieceCid));
	await assertSettlementRecipientsAllowlisted({
		participantWallets: participantRows.map((p) => getAddress(p.wallet)),
		organizationId: organizationId ?? file.organizationId ?? undefined,
		rules,
	});

	await assertSettlementRulesVerifiedOnChain(
		getAddress(sender),
		pieceCid,
		rules,
		validatorAddress,
		file.registryAddress,
		orgId,
	);

	await insertSettlementRulesForFile(
		pieceCid,
		getAddress(sender),
		rules,
		validatorAddress,
	);

	return { count: rules.length };
}
