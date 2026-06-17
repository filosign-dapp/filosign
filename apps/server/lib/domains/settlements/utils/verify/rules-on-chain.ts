import { check } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import { computeCidIdentifier } from "@filosign/evm";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { eq } from "drizzle-orm";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import { resolveEntitlementContext } from "@/lib/domains/entitlements";
import {
	assertCommitmentsOnEnvelopeRoster,
	collectSettlementReleaseSignerCommitments,
} from "@/lib/domains/files/utils/assert-roster-commitments";
import db from "@/lib/platform/db";
import {
	evmClient,
	fsEnvelopeRegistryAt,
	fsPaymentValidatorAt,
} from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { settlementSchema } from "../schema";
import { readOnChainRuleHeader } from "./rule-header";
import { assertOnChainRuleLegsMatch } from "./rule-legs";
import { assertOnChainReleaseParamsMatch } from "./rule-release-params";

async function assertTxSucceeded(hash: Hex, label: string) {
	const res = await tryCatch(evmClient.waitForTransactionReceipt({ hash }));
	if (res.error || !res.data || res.data.status !== "success") {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: `${label} transaction not found or failed on-chain`,
			},
		});
	}
}

async function assertEnvelopeRegisteredOnChain(
	pieceCid: string,
	registryAddress?: `0x${string}` | null,
) {
	const registry = fsEnvelopeRegistryAt(registryAddress ?? null);
	const cidRes = await tryCatch(registry.read.cidIdentifier([pieceCid]));
	if (cidRes.error || !cidRes.data) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "Could not resolve document identifier on registry",
			},
		});
	}
	const regRes = await tryCatch(
		registry.read.envelopeRegistrations([cidRes.data as Hex]),
	);
	const registration = regRes.data as { timestamp: bigint } | undefined;
	if (regRes.error || !registration || registration.timestamp === 0n) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "Document is not registered on-chain",
			},
		});
	}
}

async function assertRuleMatchesOnChain(args: {
	validator: ReturnType<typeof fsPaymentValidatorAt>;
	expectedCid: Hex;
	rule: SettlementRuleRegistrationInput;
	allowedPayers: ReadonlySet<string>;
	orgWalletPayerBlocked: boolean;
	orgWalletAddress?: string | null;
}) {
	const header = await readOnChainRuleHeader(args);
	const payer = getAddress(header[0] as Address).toLowerCase();
	if (
		args.orgWalletPayerBlocked &&
		args.orgWalletAddress &&
		payer === args.orgWalletAddress
	) {
		throwAppError("ENTITLEMENT.FEATURE_DISABLED");
	}
	if (!args.allowedPayers.has(payer)) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "On-chain payer is not authorized for this envelope",
			},
		});
	}
	await assertOnChainRuleLegsMatch({
		validator: args.validator,
		rule: args.rule,
	});
	await assertOnChainReleaseParamsMatch({
		validator: args.validator,
		rule: args.rule,
		header,
	});
}

/** Ensures indexed settlement rules exist on-chain for this sender and document. */
export async function resolveAllowedSettlementPayers(
	sender: Address,
	organizationId?: string | null,
): Promise<{
	allowed: ReadonlySet<string>;
	orgWalletAddress: string | null;
	orgWalletPayerBlocked: boolean;
}> {
	const senderNorm = getAddress(sender);
	const allowed = new Set<string>([senderNorm.toLowerCase()]);
	if (!organizationId) {
		return {
			allowed,
			orgWalletAddress: null,
			orgWalletPayerBlocked: false,
		};
	}

	const { organizations } = settlementSchema();
	const [org] = await db
		.select({ orgWalletAddress: organizations.orgWalletAddress })
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1);

	const orgWalletAddress = org?.orgWalletAddress
		? getAddress(org.orgWalletAddress).toLowerCase()
		: null;
	if (!orgWalletAddress) {
		return {
			allowed,
			orgWalletAddress: null,
			orgWalletPayerBlocked: false,
		};
	}

	const entitlementCtx = await resolveEntitlementContext(
		senderNorm,
		organizationId,
	);
	const canUseOrgWalletPayer = check(
		entitlementCtx,
		"features.treasury.workspace_custom",
	).allowed;

	if (!canUseOrgWalletPayer) {
		return {
			allowed,
			orgWalletAddress,
			orgWalletPayerBlocked: true,
		};
	}

	allowed.add(orgWalletAddress);
	return {
		allowed,
		orgWalletAddress,
		orgWalletPayerBlocked: false,
	};
}

export async function assertSettlementRulesVerifiedOnChain(
	sender: Address,
	pieceCid: string,
	rules: SettlementRuleRegistrationInput[],
	validatorAddress?: `0x${string}`,
	registryAddress?: `0x${string}` | null,
	organizationId?: string | null,
) {
	if (rules.length === 0) return;

	const validator = fsPaymentValidatorAt(validatorAddress ?? null);
	if (!validator) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason:
					"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
			},
		});
	}

	await assertEnvelopeRegisteredOnChain(pieceCid, registryAddress);

	const expectedCid = computeCidIdentifier(pieceCid);
	const registry = fsEnvelopeRegistryAt(registryAddress ?? null);
	const payerContext = await resolveAllowedSettlementPayers(
		sender,
		organizationId,
	);

	for (const rule of rules) {
		await assertRuleMatchesOnChain({
			validator,
			expectedCid,
			rule,
			allowedPayers: payerContext.allowed,
			orgWalletAddress: payerContext.orgWalletAddress,
			orgWalletPayerBlocked: payerContext.orgWalletPayerBlocked,
		});
		if (registry) {
			await assertCommitmentsOnEnvelopeRoster({
				registry,
				cidId: expectedCid,
				commitments: collectSettlementReleaseSignerCommitments(rule),
			});
		}
		await assertTxSucceeded(rule.registerRuleTxHash, "registerRule");
		await assertTxSucceeded(rule.approveTxHash, "approve");
	}
}

/** Verifies on-chain rule fields after a client `updatePayoutRule` tx. */
export async function assertSettlementRuleUpdateOnChain(
	sender: Address,
	pieceCid: string,
	rule: SettlementRuleRegistrationInput,
	updateRuleTxHash: Hex,
	validatorAddress: `0x${string}`,
	registryAddress?: `0x${string}` | null,
	organizationId?: string | null,
) {
	const validator = fsPaymentValidatorAt(validatorAddress);
	const expectedCid = computeCidIdentifier(pieceCid);
	await assertTxSucceeded(updateRuleTxHash, "updateRule");
	const payerContext = await resolveAllowedSettlementPayers(
		sender,
		organizationId,
	);
	await assertRuleMatchesOnChain({
		validator,
		expectedCid,
		rule,
		allowedPayers: payerContext.allowed,
		orgWalletAddress: payerContext.orgWalletAddress,
		orgWalletPayerBlocked: payerContext.orgWalletPayerBlocked,
	});
	const registry = fsEnvelopeRegistryAt(registryAddress ?? null);
	if (registry) {
		await assertCommitmentsOnEnvelopeRoster({
			registry,
			cidId: expectedCid,
			commitments: collectSettlementReleaseSignerCommitments(rule),
		});
	}
}
