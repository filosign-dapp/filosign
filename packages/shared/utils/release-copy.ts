import type { SettlementReleaseType } from "./settlement-rules";
import {
	normalizeSettlementReleaseType,
	settlementReleaseTypesForComposeAdvanced,
} from "./settlement-rules";

export type ReleaseCopyContext = {
	/** 0 = all required signers must sign to complete the envelope */
	quorumN: number;
	signerCount: number;
};

export type ReleaseValidationIssue =
	| "threshold_missing"
	| "threshold_exceeds_signers"
	| "quorum_threshold_mismatch";

export type SettlementReleaseLabelOptions = {
	/** Per-rule threshold; substitutes N in threshold-gated labels. */
	thresholdN?: number;
};

/** Compose selectors: quorum_required duplicates all_signed when the envelope has a minimum. */
export function composeDisplayReleaseType(
	releaseType: SettlementReleaseType,
	context?: ReleaseCopyContext,
): SettlementReleaseType {
	const normalized = normalizeSettlementReleaseType(releaseType);
	if (normalized === "quorum_required" && context && context.quorumN > 0) {
		return "all_signed";
	}
	return normalized;
}

export function settlementReleaseTypesForComposeAdvancedVisible(
	context?: ReleaseCopyContext,
): readonly SettlementReleaseType[] {
	if (context && context.quorumN > 0) {
		return settlementReleaseTypesForComposeAdvanced.filter(
			(type) => type !== "quorum_required",
		);
	}
	return settlementReleaseTypesForComposeAdvanced;
}

export function settlementReleaseTypeLabel(
	releaseType: SettlementReleaseType | string,
	context?: ReleaseCopyContext,
	options?: SettlementReleaseLabelOptions,
): string {
	const normalized = normalizeSettlementReleaseType(
		releaseType as SettlementReleaseType,
	);
	const thresholdN = options?.thresholdN;

	switch (normalized) {
		case "all_signed":
			return "When signing is finished";
		case "specific_signer":
			return "When one signer signs";
		case "at_least_n":
			return thresholdN != null && thresholdN > 0
				? `When ${thresholdN} signers from your list sign`
				: "When N signers from your list sign";
		case "quorum_required":
			if (context && context.quorumN > 0) {
				return "When signing is finished";
			}
			return thresholdN != null && thresholdN > 0
				? `When ${thresholdN} required signers have signed`
				: "When N required signers have signed";
		case "quorum_set":
			return thresholdN != null && thresholdN > 0
				? `When ${thresholdN} from a chosen group sign`
				: "When N from a chosen group sign";
		case "quorum_all":
			return thresholdN != null && thresholdN > 0
				? `When ${thresholdN} people on the document sign`
				: "When N people on the document sign";
		case "all_of_set":
			return "When everyone on your list signs";
		default:
			return releaseType;
	}
}

export function settlementReleaseTypeDescription(
	releaseType: SettlementReleaseType | string,
	context?: ReleaseCopyContext,
): string {
	const normalized = normalizeSettlementReleaseType(
		releaseType as SettlementReleaseType,
	);
	const quorumN = context?.quorumN ?? 0;
	const signerCount = context?.signerCount ?? 0;
	const hasMinimum = quorumN > 0 && signerCount > 0;

	switch (normalized) {
		case "all_signed":
			if (hasMinimum) {
				return `Runs when ${quorumN} of ${signerCount} signers have signed. Not everyone has to sign.`;
			}
			return "Runs when all required signers have signed and the envelope is complete.";
		case "specific_signer":
			return "Runs as soon as the person you pick signs, even if others have not.";
		case "at_least_n":
			return "You choose which signers count. Runs when at least N of them have signed.";
		case "quorum_required":
			if (hasMinimum) {
				return `Uses your envelope minimum (${quorumN} of ${signerCount} signers). Same as when signing is finished.`;
			}
			return "Runs when at least N people on the required signer list have signed. The envelope may still be open after this.";
		case "quorum_set":
			return "Pick a group of signers. Runs when at least N in that group have signed.";
		case "quorum_all":
			return "Counts any signers on the roster, not only required ones. Can run before the envelope is finished.";
		case "all_of_set":
			return "Every signer you select must sign.";
		default:
			return settlementReleaseTypeLabel(releaseType, context);
	}
}

export function envelopeMinimumRoutingNote(
	context: ReleaseCopyContext,
): string | null {
	if (context.quorumN <= 0 || context.signerCount <= 0) return null;
	return `This envelope finishes when ${context.quorumN} of ${context.signerCount} signers have signed. "When signing is finished" uses that same rule.`;
}

export function quorumRequiredThresholdLockedHelper(
	context: ReleaseCopyContext,
): string {
	return `Matches your envelope minimum: ${context.quorumN} of ${context.signerCount} signatures.`;
}

export function formatReleaseValidationError(
	issue: ReleaseValidationIssue,
	context: ReleaseCopyContext,
): string {
	const { quorumN, signerCount } = context;

	switch (issue) {
		case "threshold_missing":
			return "Enter how many signatures are needed (at least 1).";
		case "threshold_exceeds_signers":
			return `You can't require more signatures than signers on this envelope (${signerCount} signers).`;
		case "quorum_threshold_mismatch":
			if (quorumN > 0 && signerCount > 0) {
				return `This needs ${quorumN} signatures to match your envelope minimum (${quorumN} of ${signerCount} signers). Update Advanced → Minimum signatures, or pick "When signing is finished."`;
			}
			return "These unlock conditions don't match this envelope's signing rules. Check minimum signatures in Advanced, or simplify the condition.";
	}
}
