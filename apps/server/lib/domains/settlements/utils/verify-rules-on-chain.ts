import { computeCidIdentifier } from "@filosign/contracts";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { SETTLEMENT_RELEASE_TYPE_UINT } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
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
import { assertSettlementUsdcToken } from "./assert-settlement-token";

const { organizations } = db.schema;

async function assertTxSucceeded(hash: Hex, label: string) {
	const res = await tryCatch(evmClient.waitForTransactionReceipt({ hash }));
	if (res.error || !res.data || res.data.status !== "success") {
		throw new ORPCError("BAD_REQUEST", {
			message: `${label} transaction not found or failed on-chain`,
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
		throw new ORPCError("BAD_REQUEST", {
			message: "Could not resolve document identifier on registry",
		});
	}
	const regRes = await tryCatch(
		registry.read.envelopeRegistrations([cidRes.data as Hex]),
	);
	if (regRes.error || !regRes.data || regRes.data.timestamp === 0n) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Document is not registered on-chain",
		});
	}
}

function normHex(a: string) {
	return a.toLowerCase();
}

async function assertRuleMatchesOnChain(args: {
	validator: ReturnType<typeof fsPaymentValidatorAt>;
	sender: Address;
	allowedPayers: ReadonlySet<string>;
	expectedCid: Hex;
	rule: SettlementRuleRegistrationInput;
}) {
	const { validator, sender, allowedPayers, expectedCid, rule } = args;
	const senderAddr = getAddress(sender);

	assertSettlementUsdcToken(rule.tokenAddress);

	if (rule.cidIdentifier.toLowerCase() !== expectedCid.toLowerCase()) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Settlement rule cidIdentifier does not match document",
		});
	}

	const ruleId = BigInt(rule.onChainRuleId);
	const readRes = await tryCatch(validator.read.rules([ruleId]));
	if (readRes.error || !readRes.data) {
		throw new ORPCError("BAD_REQUEST", {
			message: `Settlement rule ${rule.onChainRuleId} not found on-chain`,
		});
	}

	const [
		payer,
		token,
		cidId,
		releaseType,
		specificCommitment,
		thresholdN,
		expiresAtOnChain,
		executed,
		cancelled,
	] = readRes.data;

	if (executed || cancelled) {
		throw new ORPCError("BAD_REQUEST", {
			message: `Settlement rule ${rule.onChainRuleId} is not active on-chain`,
		});
	}
	if (!allowedPayers.has(getAddress(payer).toLowerCase())) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"On-chain payer must be the document sender wallet or the linked organization treasury",
		});
	}
	if (getAddress(token) !== getAddress(rule.tokenAddress)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "On-chain token does not match submitted settlement rule",
		});
	}
	if (cidId.toLowerCase() !== expectedCid.toLowerCase()) {
		throw new ORPCError("BAD_REQUEST", {
			message: "On-chain cidId does not match document",
		});
	}
	if (Number(releaseType) !== SETTLEMENT_RELEASE_TYPE_UINT[rule.releaseType]) {
		throw new ORPCError("BAD_REQUEST", {
			message: "On-chain release type does not match submitted settlement rule",
		});
	}

	const expectedExpires = rule.expiresAt ? BigInt(rule.expiresAt) : 0n;
	if (expiresAtOnChain !== expectedExpires) {
		throw new ORPCError("BAD_REQUEST", {
			message: "On-chain expiresAt does not match submitted settlement rule",
		});
	}

	const legsRes = await tryCatch(validator.read.ruleLegs([ruleId]));
	if (legsRes.error || !legsRes.data?.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "On-chain payout legs missing for settlement rule",
		});
	}
	if (legsRes.data.length !== rule.legs.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "On-chain leg count does not match submitted settlement rule",
		});
	}
	for (let i = 0; i < rule.legs.length; i++) {
		const submitted = rule.legs[i];
		const onChain = legsRes.data[i];
		if (
			getAddress(onChain.recipient) !== getAddress(submitted.recipientWallet)
		) {
			throw new ORPCError("BAD_REQUEST", {
				message: "On-chain payout recipient does not match submitted leg",
			});
		}
		if (onChain.amount !== BigInt(submitted.amount)) {
			throw new ORPCError("BAD_REQUEST", {
				message: "On-chain payout amount does not match submitted leg",
			});
		}
	}

	if (
		rule.releaseType === "specific_signer" &&
		rule.releaseParams.releaseType === "specific_signer"
	) {
		if (
			normHex(specificCommitment) !==
			normHex(rule.releaseParams.signerEmailCommitment)
		) {
			throw new ORPCError("BAD_REQUEST", {
				message: "On-chain signer commitment does not match settlement rule",
			});
		}
	}

	const needsCommitments =
		rule.releaseType === "at_least_n" ||
		rule.releaseType === "quorum_set" ||
		rule.releaseType === "all_of_set";
	if (needsCommitments) {
		const commitmentsRes = await tryCatch(
			validator.read.signerCommitments([ruleId]),
		);
		if (commitmentsRes.error || !commitmentsRes.data) {
			throw new ORPCError("BAD_REQUEST", {
				message: "On-chain signer commitments missing for settlement rule",
			});
		}
		const onChain = commitmentsRes.data.map(normHex).sort();
		const submitted =
			rule.releaseParams.releaseType === "at_least_n" ||
			rule.releaseParams.releaseType === "quorum_set" ||
			rule.releaseParams.releaseType === "all_of_set"
				? [...rule.releaseParams.signerEmailCommitments].map(normHex).sort()
				: [];
		if (
			onChain.length !== submitted.length ||
			onChain.some((c, i) => c !== submitted[i])
		) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"On-chain signer commitments do not match submitted settlement rule",
			});
		}
	}

	if (
		rule.releaseType === "at_least_n" &&
		rule.releaseParams.releaseType === "at_least_n"
	) {
		if (Number(thresholdN) !== rule.releaseParams.thresholdN) {
			throw new ORPCError("BAD_REQUEST", {
				message: "On-chain threshold does not match settlement rule",
			});
		}
	}
	if (
		rule.releaseType === "quorum_set" &&
		rule.releaseParams.releaseType === "quorum_set"
	) {
		if (Number(thresholdN) !== rule.releaseParams.thresholdN) {
			throw new ORPCError("BAD_REQUEST", {
				message: "On-chain quorum threshold does not match settlement rule",
			});
		}
	}
	if (
		(rule.releaseType === "quorum_required" &&
			rule.releaseParams.releaseType === "quorum_required") ||
		(rule.releaseType === "quorum_all" &&
			rule.releaseParams.releaseType === "quorum_all")
	) {
		if (Number(thresholdN) !== rule.releaseParams.thresholdN) {
			throw new ORPCError("BAD_REQUEST", {
				message: "On-chain threshold does not match settlement rule",
			});
		}
	}
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
	sender: Address,
	pieceCid: string,
	rules: SettlementRuleRegistrationInput[],
	validatorAddress?: `0x${string}`,
	registryAddress?: `0x${string}` | null,
	organizationId?: string | null,
) {
	if (rules.length === 0) return;

	const allowedPayers = await resolveAllowedSettlementPayers(
		sender,
		organizationId,
	);

	const validator = fsPaymentValidatorAt(validatorAddress ?? null);
	if (!validator) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		});
	}

	await assertEnvelopeRegisteredOnChain(pieceCid, registryAddress);

	const expectedCid = computeCidIdentifier(pieceCid);

	for (const rule of rules) {
		await assertRuleMatchesOnChain({
			validator,
			sender,
			allowedPayers,
			expectedCid,
			rule,
		});
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
	organizationId?: string | null,
) {
	const validator = fsPaymentValidatorAt(validatorAddress);
	await assertTxSucceeded(updateRuleTxHash, "updateRule");
	const allowedPayers = await resolveAllowedSettlementPayers(
		sender,
		organizationId,
	);
	await assertRuleMatchesOnChain({
		validator,
		sender,
		allowedPayers,
		expectedCid: computeCidIdentifier(pieceCid),
		rule,
	});
}
