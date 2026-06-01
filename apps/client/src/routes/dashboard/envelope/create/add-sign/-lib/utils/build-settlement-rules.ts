import type { SettlementRuleDraft } from "@filosign/react/files";
import { isAdvancedSettlementReleaseType } from "@filosign/shared";
import { parseUnits } from "viem";
import { SUPPORTED_TOKENS } from "@/src/constants";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import { buildReleaseParamsFromDraft } from "@/src/lib/domains/settlements/build-release-params";
import type { SettlementAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/settlement-attachment";

function draftWithRecipientWallet(
	d: SettlementAttachmentDraft,
): d is SettlementAttachmentDraft & { recipientWallet: `0x${string}` } {
	return Boolean(d.recipientWallet);
}

function draftToLeg(
	d: SettlementAttachmentDraft & { recipientWallet: `0x${string}` },
) {
	const token = SUPPORTED_TOKENS[0];
	return {
		recipientWallet: d.recipientWallet,
		recipientSource: d.recipientSource,
		amount: parseUnits(d.amountUsdc.trim(), token.decimals),
	};
}

function draftToRule(
	draft: SettlementAttachmentDraft & { recipientWallet: `0x${string}` },
	recipients: Recipient[],
): SettlementRuleDraft {
	const token = SUPPORTED_TOKENS[0];
	const releaseType = draft.releaseType;
	return {
		tokenAddress: token.address,
		releaseType,
		releaseParams: buildReleaseParamsFromDraft(draft, recipients),
		expiresAt: draft.expiresAtUnix ? BigInt(draft.expiresAtUnix) : undefined,
		legs: [draftToLeg(draft)],
	};
}

function canCombineDrafts(
	drafts: (SettlementAttachmentDraft & { recipientWallet: `0x${string}` })[],
): boolean {
	if (drafts.length < 2) return false;
	const first = drafts[0];
	if (!first) return false;
	return drafts.every(
		(d) =>
			d.releaseType === first.releaseType &&
			d.specificSignerEmail === first.specificSignerEmail &&
			d.thresholdN === first.thresholdN,
	);
}

export function buildSettlementRulesForSend(args: {
	drafts: SettlementAttachmentDraft[];
	recipients: Recipient[];
	combineLegs?: boolean;
	canUseAdvancedSettlements?: boolean;
}): SettlementRuleDraft[] {
	const token = SUPPORTED_TOKENS[0];
	const resolved = args.drafts.filter(
		(d): d is SettlementAttachmentDraft & { recipientWallet: `0x${string}` } =>
			Boolean(d.amountUsdc.trim()) &&
			Number(d.amountUsdc) > 0 &&
			draftWithRecipientWallet(d),
	);

	if (resolved.length === 0) return [];

	const combine =
		Boolean(args.canUseAdvancedSettlements) &&
		Boolean(args.combineLegs) &&
		canCombineDrafts(resolved);

	if (combine) {
		const first = resolved[0];
		if (!first) return [];
		return [
			{
				tokenAddress: token.address,
				releaseType: first.releaseType,
				releaseParams: buildReleaseParamsFromDraft(first, args.recipients),
				expiresAt: first.expiresAtUnix
					? BigInt(first.expiresAtUnix)
					: undefined,
				legs: resolved.map(draftToLeg),
			},
		];
	}

	return resolved.map((draft) => {
		if (
			!args.canUseAdvancedSettlements &&
			(isAdvancedSettlementReleaseType(draft.releaseType) ||
				resolved.length > 1)
		) {
			throw new Error("These payout options need Teams Pro or Enterprise.");
		}
		return draftToRule(draft, args.recipients);
	});
}
