import { throwAppError } from "@filosign/errors/server";
import {
	SETTLEMENT_RELEASE_TYPE_UINT,
	type SettlementReleaseType,
	type SettlementRuleRegistrationInput,
	settlementReleaseTypes,
} from "@filosign/shared";
import type { Hex } from "viem";
import type { fsEnvelopeRegistryAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const ZERO_BYTES32 = `0x${"0".repeat(64)}` as Hex;

const RELEASE_TYPE_BY_UINT = Object.fromEntries(
	settlementReleaseTypes.map((releaseType) => [
		SETTLEMENT_RELEASE_TYPE_UINT[releaseType],
		releaseType,
	]),
) as Record<number, SettlementReleaseType>;

export function collectSettlementReleaseSignerCommitments(
	rule: SettlementRuleRegistrationInput,
): Hex[] {
	const params = rule.releaseParams;
	switch (params.releaseType) {
		case "specific_signer":
			return [params.signerEmailCommitment];
		case "at_least_n":
		case "quorum_set":
		case "all_of_set":
			return [...params.signerEmailCommitments];
		default:
			return [];
	}
}

export function collectOnChainReleaseSignerCommitments(args: {
	releaseTypeUint: number;
	specificSignerCommitment: Hex;
	signerCommitments: readonly Hex[];
}): Hex[] {
	const releaseType = RELEASE_TYPE_BY_UINT[args.releaseTypeUint];
	if (!releaseType) return [];

	if (releaseType === "specific_signer") {
		if (args.specificSignerCommitment.toLowerCase() === ZERO_BYTES32) {
			return [];
		}
		return [args.specificSignerCommitment];
	}

	if (
		releaseType === "at_least_n" ||
		releaseType === "quorum_set" ||
		releaseType === "all_of_set"
	) {
		return [...args.signerCommitments];
	}

	return [];
}

export async function assertCommitmentsOnEnvelopeRoster(args: {
	registry: NonNullable<ReturnType<typeof fsEnvelopeRegistryAt>>;
	cidId: Hex;
	commitments: readonly Hex[];
}): Promise<void> {
	for (const commitment of args.commitments) {
		const isSignerRes = await tryCatch(
			args.registry.read.isSigner([args.cidId, commitment]),
		);
		if (isSignerRes.error || !isSignerRes.data) {
			throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
				params: {
					reason:
						"Release condition references a signer not on the envelope roster",
				},
			});
		}
	}
}
