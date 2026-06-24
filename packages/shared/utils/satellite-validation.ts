import type { Address, Hex } from "viem";
import { getAddress, isAddress } from "viem";
import { hashNormalizedSignerEmail, sortedCommitsForEmails } from "./crypto";
import { normalizePlacementRecipientEmail } from "./placement";
import type { ReleaseRoutingContext } from "./release-validation";
import {
	type RoutingResolvedReleaseParams,
	validateReleaseParamsForRouting,
} from "./release-validation";
import type {
	SettlementReleaseParams,
	SettlementReleaseType,
} from "./settlement-rules";
import { normalizeSettlementReleaseType } from "./settlement-rules";

const ZERO_COMMITMENT = `0x${"00".repeat(32)}` as Hex;
const MAX_PAYOUT_LEGS = 32;
const MAX_RULE_COMMITMENTS = 128;
const MAX_RULES_PER_CID = 128;

export type SatelliteReleaseDraft = {
	releaseType: SettlementReleaseType;
	thresholdN?: number;
	specificSignerEmail?: string;
	expiresAtUnix?: number;
};

export type SatellitePayoutLegDraft = SatelliteReleaseDraft & {
	id: string;
	ruleId?: string;
	recipientClientRowId?: string;
	recipientWallet?: string;
	amountUsdc?: string;
};

export type SatelliteAttachmentDraft = SatelliteReleaseDraft & {
	packetId: string;
	releaseMode: "review" | "conditional";
	recipientEmails: string[];
};

export type SatelliteValidationFailure = {
	scope: "payout" | "attachment";
	message: string;
};

export type SatelliteValidationResult =
	| { ok: true }
	| { ok: false; failure: SatelliteValidationFailure };

export type ValidateSatelliteRulesForSendInput = {
	routing: ReleaseRoutingContext;
	signerEmails: string[];
	payerAddress?: string | null;
	settlementDrafts?: SatellitePayoutLegDraft[];
	attachmentDrafts?: SatelliteAttachmentDraft[];
	nowUnix?: number;
};

function fail(
	scope: SatelliteValidationFailure["scope"],
	message: string,
): SatelliteValidationResult {
	return { ok: false, failure: { scope, message } };
}

function signerCommitmentsFromEmails(emails: readonly string[]): Hex[] {
	const commitments: Hex[] = [];
	for (const email of emails) {
		const trimmed = email.trim();
		if (!trimmed) continue;
		commitments.push(
			hashNormalizedSignerEmail(normalizePlacementRecipientEmail(trimmed)),
		);
	}
	return commitments;
}

function hasZeroOrDuplicateCommitments(commitments: readonly Hex[]): boolean {
	const seen = new Set<string>();
	for (const commitment of commitments) {
		if (commitment === ZERO_COMMITMENT) return true;
		const key = commitment.toLowerCase();
		if (seen.has(key)) return true;
		seen.add(key);
	}
	return false;
}

function recipientCommitmentsAreStrictlyAscending(
	emails: readonly string[],
): boolean {
	const sorted = sortedCommitsForEmails(emails);
	for (let i = 1; i < sorted.length; i++) {
		const prev = sorted[i - 1];
		const current = sorted[i];
		if (!prev || !current || prev >= current) {
			return false;
		}
	}
	return true;
}

function buildReleaseParamsFromDraft(args: {
	draft: SatelliteReleaseDraft;
	signerEmails: readonly string[];
	resolved: RoutingResolvedReleaseParams;
}): SettlementReleaseParams {
	const releaseType = normalizeSettlementReleaseType(args.draft.releaseType);
	const signerCommitments = signerCommitmentsFromEmails(args.signerEmails);

	switch (releaseType) {
		case "all_signed":
			return { releaseType: "all_signed" };
		case "all_required_signed":
			return { releaseType: "all_required_signed" };
		case "all_signed_complete":
			return { releaseType: "all_signed_complete" };
		case "specific_signer": {
			const email = args.draft.specificSignerEmail?.trim();
			if (!email) {
				throw new Error("Specific signer email is required");
			}
			return {
				releaseType: "specific_signer",
				signerEmailCommitment: hashNormalizedSignerEmail(
					normalizePlacementRecipientEmail(email),
				),
			};
		}
		case "at_least_n": {
			const thresholdN =
				args.resolved.releaseType === "at_least_n"
					? args.resolved.thresholdN
					: (args.draft.thresholdN ?? 1);
			return {
				releaseType: "at_least_n",
				thresholdN,
				signerEmailCommitments: signerCommitments,
			};
		}
		case "quorum_required": {
			const thresholdN =
				args.resolved.releaseType === "quorum_required"
					? args.resolved.thresholdN
					: (args.draft.thresholdN ?? 1);
			return { releaseType: "quorum_required", thresholdN };
		}
		case "quorum_set": {
			const thresholdN =
				args.resolved.releaseType === "quorum_set"
					? args.resolved.thresholdN
					: (args.draft.thresholdN ?? 1);
			return {
				releaseType: "quorum_set",
				thresholdN,
				signerEmailCommitments: signerCommitments,
			};
		}
		case "quorum_all": {
			const thresholdN =
				args.resolved.releaseType === "quorum_all"
					? args.resolved.thresholdN
					: (args.draft.thresholdN ?? 1);
			return { releaseType: "quorum_all", thresholdN };
		}
		case "all_of_set":
			return {
				releaseType: "all_of_set",
				signerEmailCommitments: signerCommitments,
			};
		default:
			return { releaseType: "all_signed" };
	}
}

function validateContractReleaseParams(
	params: SettlementReleaseParams,
): string | null {
	switch (params.releaseType) {
		case "specific_signer":
			if (params.signerEmailCommitment === ZERO_COMMITMENT) {
				return "Choose a signer for this unlock condition.";
			}
			return null;
		case "at_least_n":
		case "quorum_set":
			if (
				params.thresholdN === 0 ||
				params.signerEmailCommitments.length === 0 ||
				params.thresholdN > params.signerEmailCommitments.length
			) {
				return "These unlock conditions don't match this envelope's signing rules. Check minimum signatures in Advanced, or simplify the condition.";
			}
			if (params.signerEmailCommitments.length > MAX_RULE_COMMITMENTS) {
				return "Too many signers linked to this rule.";
			}
			if (hasZeroOrDuplicateCommitments(params.signerEmailCommitments)) {
				return "These unlock conditions don't match this envelope's signing rules. Check minimum signatures in Advanced, or simplify the condition.";
			}
			return null;
		case "all_of_set":
			if (params.signerEmailCommitments.length === 0) {
				return "These unlock conditions don't match this envelope's signing rules. Check minimum signatures in Advanced, or simplify the condition.";
			}
			if (params.signerEmailCommitments.length > MAX_RULE_COMMITMENTS) {
				return "Too many signers linked to this rule.";
			}
			if (hasZeroOrDuplicateCommitments(params.signerEmailCommitments)) {
				return "These unlock conditions don't match this envelope's signing rules. Check minimum signatures in Advanced, or simplify the condition.";
			}
			return null;
		case "quorum_all":
		case "quorum_required":
			if (params.thresholdN === 0) {
				return "Enter how many signatures are needed (at least 1).";
			}
			return null;
		default:
			return null;
	}
}

function validateExpiresAt(
	expiresAtUnix: number | undefined,
	nowUnix: number,
): string | null {
	if (expiresAtUnix == null || expiresAtUnix === 0) return null;
	if (expiresAtUnix <= nowUnix) {
		return "The expiry date must be in the future.";
	}
	return null;
}

function validateReleaseDraftForSend(args: {
	draft: SatelliteReleaseDraft;
	routing: ReleaseRoutingContext;
	signerEmails: readonly string[];
	scope: SatelliteValidationFailure["scope"];
	nowUnix: number;
}): SatelliteValidationResult {
	const routingValidation = validateReleaseParamsForRouting({
		releaseType: args.draft.releaseType,
		thresholdN: args.draft.thresholdN,
		routing: args.routing,
	});
	if (!routingValidation.ok) {
		return fail(args.scope, routingValidation.message);
	}

	const expiresIssue = validateExpiresAt(
		args.draft.expiresAtUnix,
		args.nowUnix,
	);
	if (expiresIssue) {
		return fail(args.scope, expiresIssue);
	}

	let releaseParams: SettlementReleaseParams;
	try {
		releaseParams = buildReleaseParamsFromDraft({
			draft: args.draft,
			signerEmails: args.signerEmails,
			resolved: routingValidation.params,
		});
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "These unlock conditions aren't valid for this envelope.";
		return fail(args.scope, message);
	}

	const contractIssue = validateContractReleaseParams(releaseParams);
	if (contractIssue) {
		return fail(args.scope, contractIssue);
	}

	return { ok: true };
}

function groupPayoutDrafts(
	drafts: readonly SatellitePayoutLegDraft[],
): Map<string, SatellitePayoutLegDraft[]> {
	const groups = new Map<string, SatellitePayoutLegDraft[]>();
	for (const draft of drafts) {
		if (!draft.recipientClientRowId) continue;
		const key = draft.ruleId ?? draft.id;
		const group = groups.get(key) ?? [];
		group.push(draft);
		groups.set(key, group);
	}
	return groups;
}

function payoutLegsFromGroup(
	legs: readonly SatellitePayoutLegDraft[],
): Array<{ recipientWallet: Address; amountUsdc: string }> {
	const resolved: Array<{ recipientWallet: Address; amountUsdc: string }> = [];
	for (const leg of legs) {
		const amount = leg.amountUsdc?.trim() ?? "";
		if (!amount || Number(amount) <= 0) continue;
		if (!leg.recipientWallet || !isAddress(leg.recipientWallet)) continue;
		resolved.push({
			recipientWallet: getAddress(leg.recipientWallet),
			amountUsdc: amount,
		});
	}
	return resolved;
}

function validatePayoutLegs(args: {
	payerAddress: string;
	legs: Array<{ recipientWallet: Address; amountUsdc: string }>;
}): string | null {
	if (!isAddress(args.payerAddress)) {
		return "Connect a wallet to register payouts on send.";
	}
	const payer = getAddress(args.payerAddress);
	if (args.legs.length === 0) {
		return "Add at least one payout recipient with a valid amount.";
	}
	if (args.legs.length > MAX_PAYOUT_LEGS) {
		return "Too many recipients on this payout.";
	}
	for (const leg of args.legs) {
		if (leg.recipientWallet === payer) {
			return "The payer can't also be a recipient on the same payout.";
		}
	}
	return null;
}

function validatePayoutDraftsForSend(args: {
	drafts: readonly SatellitePayoutLegDraft[];
	routing: ReleaseRoutingContext;
	signerEmails: readonly string[];
	payerAddress?: string | null;
	nowUnix: number;
}): SatelliteValidationResult {
	if (args.drafts.length === 0) return { ok: true };

	const groups = groupPayoutDrafts(args.drafts);
	if (groups.size === 0) {
		return fail(
			"payout",
			"Add at least one payout recipient with a valid amount.",
		);
	}
	if (groups.size > MAX_RULES_PER_CID) {
		return fail("payout", "Too many payout rules for one envelope.");
	}

	for (const [, legs] of groups) {
		const first = legs[0];
		if (!first) continue;

		const releaseValidation = validateReleaseDraftForSend({
			draft: first,
			routing: args.routing,
			signerEmails: args.signerEmails,
			scope: "payout",
			nowUnix: args.nowUnix,
		});
		if (!releaseValidation.ok) {
			return releaseValidation;
		}

		const resolvedLegs = payoutLegsFromGroup(legs);
		const legsIssue = validatePayoutLegs({
			payerAddress: args.payerAddress ?? "",
			legs: resolvedLegs,
		});
		if (legsIssue) {
			const hasConfiguredLegs = legs.some(
				(leg) =>
					leg.recipientClientRowId &&
					leg.amountUsdc?.trim() &&
					Number(leg.amountUsdc.trim()) > 0,
			);
			if (hasConfiguredLegs && resolvedLegs.length === 0) {
				return fail(
					"payout",
					"Filosign payout recipients need a linked wallet, or add an external wallet address with a valid amount.",
				);
			}
			return fail("payout", legsIssue);
		}
	}

	return { ok: true };
}

function validateAttachmentDraftsForSend(args: {
	drafts: readonly SatelliteAttachmentDraft[];
	routing: ReleaseRoutingContext;
	signerEmails: readonly string[];
	nowUnix: number;
}): SatelliteValidationResult {
	const conditional = args.drafts.filter(
		(d) => d.releaseMode === "conditional",
	);
	if (conditional.length === 0) return { ok: true };
	if (conditional.length > MAX_RULES_PER_CID) {
		return fail(
			"attachment",
			"Too many conditional file packets for one envelope.",
		);
	}

	for (const draft of conditional) {
		if (!recipientCommitmentsAreStrictlyAscending(draft.recipientEmails)) {
			return fail(
				"attachment",
				"These unlock conditions don't match this envelope's signing rules. Check minimum signatures in Advanced, or simplify the condition.",
			);
		}

		const releaseValidation = validateReleaseDraftForSend({
			draft,
			routing: args.routing,
			signerEmails: args.signerEmails,
			scope: "attachment",
			nowUnix: args.nowUnix,
		});
		if (!releaseValidation.ok) {
			return releaseValidation;
		}
	}

	return { ok: true };
}

export function validateSatelliteRulesForSend(
	input: ValidateSatelliteRulesForSendInput,
): SatelliteValidationResult {
	const nowUnix = input.nowUnix ?? Math.floor(Date.now() / 1000);
	const signerEmails = input.signerEmails.filter((email) => email.trim());

	const payoutValidation = validatePayoutDraftsForSend({
		drafts: input.settlementDrafts ?? [],
		routing: input.routing,
		signerEmails,
		payerAddress: input.payerAddress,
		nowUnix,
	});
	if (!payoutValidation.ok) {
		return payoutValidation;
	}

	return validateAttachmentDraftsForSend({
		drafts: input.attachmentDrafts ?? [],
		routing: input.routing,
		signerEmails,
		nowUnix,
	});
}
