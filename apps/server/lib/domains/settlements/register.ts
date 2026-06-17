import { check } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { zSettlementRuleRegistrationInput } from "@filosign/shared";
import { eq } from "drizzle-orm";
import { type Address, getAddress } from "viem";
import z from "zod";
import { resolveEntitlementContext } from "@/lib/domains/entitlements";
import db from "@/lib/platform/db";
import { fsContracts, fsPaymentValidatorAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { assertSettlementLegRecipientAllowlisted } from "./utils/assert-recipient-leg";
import { assertSettlementRulesUsdcToken } from "./utils/assert-settlement-token";
import { assertSettlementRuleEntitlements } from "./utils/entitlements";
import { settlementSchema } from "./utils/schema";
import { assertSettlementRulesVerifiedOnChain } from "./utils/verify/rules-on-chain";

export const zSettlementRulesRegisterBatch = z.array(
	zSettlementRuleRegistrationInput,
);

export { assertSettlementRulesVerifiedOnChain };

type DbExecutor =
	| typeof db
	| Parameters<Parameters<typeof db.transaction>[0]>[0];

async function readOnChainPayerWallet(
	validator: ReturnType<typeof fsPaymentValidatorAt>,
	onChainRuleId: string,
): Promise<`0x${string}`> {
	const readRes = await tryCatch(validator.read.rules([BigInt(onChainRuleId)]));
	if (readRes.error || !readRes.data) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: `Settlement rule ${onChainRuleId} not found on-chain`,
			},
		});
	}
	return getAddress(readRes.data[0] as Address) as `0x${string}`;
}

export async function insertSettlementRulesForFile(
	pieceCid: string,
	rules: z.infer<typeof zSettlementRulesRegisterBatch>,
	validatorAddress: `0x${string}`,
	executor: DbExecutor = db,
) {
	if (rules.length === 0) return;

	const validator = fsPaymentValidatorAt(validatorAddress);
	const rows = await Promise.all(
		rules.map(async (r) => {
			if (!r.legs[0]) {
				throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
					params: {
						reason: "Settlement rule requires at least one payout leg",
					},
				});
			}
			const payerWallet = await readOnChainPayerWallet(
				validator,
				r.onChainRuleId,
			);
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

	const { fileSettlementRules } = settlementSchema();
	await executor.insert(fileSettlementRules).values(rows);
}

function norm(addr: string) {
	return getAddress(addr).toLowerCase();
}

export async function assertSettlementRecipientsAllowlisted(args: {
	participantWallets: `0x${string}`[];
	organizationId?: string;
	rules: SettlementRuleRegistrationInput[];
	includeOrgWallet?: boolean;
}) {
	if (args.rules.length === 0) return;

	const allowed = new Set(args.participantWallets.map((w) => norm(w)));

	let orgWallet: `0x${string}` | null = null;
	if (args.organizationId && args.includeOrgWallet !== false) {
		const { organizations } = settlementSchema();
		const [org] = await db
			.select({ orgWalletAddress: organizations.orgWalletAddress })
			.from(organizations)
			.where(eq(organizations.id, args.organizationId))
			.limit(1);

		if (org?.orgWalletAddress) {
			orgWallet = getAddress(org.orgWalletAddress) as `0x${string}`;
			allowed.add(norm(orgWallet));
		}
	}

	for (const rule of args.rules) {
		for (const leg of rule.legs) {
			assertSettlementLegRecipientAllowlisted({
				leg,
				allowed,
				orgWallet,
				participantWallets: args.participantWallets,
			});
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
		throw throwZodBadRequest(parsed.error);
	}

	const { pieceCid, organizationId, rules } = parsed.data;
	const { files, fileParticipants } = settlementSchema();
	const [file] = await db
		.select({
			sender: files.sender,
			organizationId: files.organizationId,
			registryAddress: files.registryAddress,
			completedAt: files.completedAt,
			revokedBeforeCompletedAt: files.revokedBeforeCompletedAt,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);
	if (!file) {
		throw throwAppError("FILES.NOT_FOUND");
	}
	if (getAddress(file.sender) !== getAddress(sender)) {
		throw throwAppError("SETTLEMENTS.FORBIDDEN");
	}
	if (file.completedAt != null || file.revokedBeforeCompletedAt != null) {
		throw throwAppError("SETTLEMENTS.ENVELOPE_CLOSED");
	}
	if (organizationId && organizationId !== (file.organizationId ?? undefined)) {
		throw throwAppError("SETTLEMENTS.FORBIDDEN");
	}
	const orgId = file.organizationId ?? null;

	const entitlementCtx = await resolveEntitlementContext(
		getAddress(sender),
		orgId,
	);
	const canUseCustomTreasury = check(
		entitlementCtx,
		"features.treasury.workspace_custom",
	).allowed;
	for (const rule of rules) {
		await assertSettlementRuleEntitlements(
			entitlementCtx,
			rule,
			orgId,
			getAddress(sender),
		);
	}
	assertSettlementRulesUsdcToken(rules);

	const validatorAddress = getAddress(
		fsContracts.FSPaymentValidator.address,
	) as `0x${string}`;

	const participantRows = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(eq(fileParticipants.filePieceCid, pieceCid));
	await assertSettlementRecipientsAllowlisted({
		participantWallets: participantRows.map(
			(p) => getAddress(p.wallet as Address) as `0x${string}`,
		),
		organizationId: orgId ?? undefined,
		rules,
		includeOrgWallet: canUseCustomTreasury,
	});

	await assertSettlementRulesVerifiedOnChain(
		getAddress(sender) as Address,
		pieceCid,
		rules,
		validatorAddress,
		(file.registryAddress as `0x${string}` | null | undefined) ?? undefined,
		orgId,
	);

	await insertSettlementRulesForFile(pieceCid, rules, validatorAddress);

	return { count: rules.length };
}
