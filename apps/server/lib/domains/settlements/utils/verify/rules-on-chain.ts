import { computeCidIdentifier } from "@filosign/contracts";
import { throwAppError } from "@filosign/errors/server";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { eq } from "drizzle-orm";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import {
	evmClient,
	fsEnvelopeRegistryAt,
	fsPaymentValidatorAt,
} from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { readOnChainRuleHeader } from "./rule-header";
import { assertOnChainRuleLegsMatch } from "./rule-legs";
import { assertOnChainReleaseParamsMatch } from "./rule-release-params";

const { organizations } = db.schema;

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
	if (regRes.error || !regRes.data || regRes.data.timestamp === 0n) {
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
}) {
	const header = await readOnChainRuleHeader(args);
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
): Promise<ReadonlySet<string>> {
	const allowed = new Set<string>([getAddress(sender).toLowerCase()]);
	if (!organizationId) return allowed;

	const [org] = await db
		.select({ orgWalletAddress: organizations.orgWalletAddress })
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1);

	if (org?.orgWalletAddress) {
		allowed.add(getAddress(org.orgWalletAddress).toLowerCase());
	}
	return allowed;
}

export async function assertSettlementRulesVerifiedOnChain(
	_sender: Address,
	pieceCid: string,
	rules: SettlementRuleRegistrationInput[],
	validatorAddress?: `0x${string}`,
	registryAddress?: `0x${string}` | null,
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

	for (const rule of rules) {
		await assertRuleMatchesOnChain({
			validator,
			expectedCid,
			rule,
		});
		await assertTxSucceeded(rule.registerRuleTxHash, "registerRule");
		await assertTxSucceeded(rule.approveTxHash, "approve");
	}
}

/** Verifies on-chain rule fields after a client `updatePayoutRule` tx. */
export async function assertSettlementRuleUpdateOnChain(
	_sender: Address,
	pieceCid: string,
	rule: SettlementRuleRegistrationInput,
	updateRuleTxHash: Hex,
	validatorAddress: `0x${string}`,
) {
	const validator = fsPaymentValidatorAt(validatorAddress);
	await assertTxSucceeded(updateRuleTxHash, "updateRule");
	await assertRuleMatchesOnChain({
		validator,
		expectedCid: computeCidIdentifier(pieceCid),
		rule,
	});
}
