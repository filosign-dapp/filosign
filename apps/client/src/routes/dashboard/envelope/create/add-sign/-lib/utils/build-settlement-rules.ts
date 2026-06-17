import type { SettlementRuleDraft } from "@filosign/react/files";
import { isAdvancedSettlementReleaseType } from "@filosign/shared";
import { parseUnits } from "viem";
import { SUPPORTED_TOKENS } from "@/src/constants";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements";
import { buildReleaseParamsFromDraft } from "@/src/lib/domains/settlements";
import { getRuleGroups } from "@/src/routes/dashboard/envelope/create/-lib/utils/settlement-drafts";

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

function ruleGroupToSettlementRule(
	resolvedLegs: (SettlementAttachmentDraft & {
		recipientWallet: `0x${string}`;
	})[],
	recipients: Recipient[],
): SettlementRuleDraft {
	const token = SUPPORTED_TOKENS[0];
	const first = resolvedLegs[0];
	if (!first) {
		throw new Error("Payout rule has no legs");
	}
	return {
		tokenAddress: token.address,
		releaseType: first.releaseType,
		releaseParams: buildReleaseParamsFromDraft(first, recipients),
		expiresAt: first.expiresAtUnix ? BigInt(first.expiresAtUnix) : undefined,
		legs: resolvedLegs.map(draftToLeg),
	};
}

export function buildSettlementRulesForSend(args: {
	drafts: SettlementAttachmentDraft[];
	recipients: Recipient[];
	canUseAdvancedSettlements?: boolean;
}): SettlementRuleDraft[] {
	const resolved = args.drafts.filter(
		(d): d is SettlementAttachmentDraft & { recipientWallet: `0x${string}` } =>
			Boolean(d.recipientClientRowId) &&
			Boolean(d.amountUsdc.trim()) &&
			Number(d.amountUsdc) > 0 &&
			draftWithRecipientWallet(d),
	);

	if (resolved.length === 0) return [];

	const groups = getRuleGroups(resolved);
	const rules: SettlementRuleDraft[] = [];

	for (const group of groups) {
		const groupLegs = group.legs.filter(
			(
				d,
			): d is SettlementAttachmentDraft & { recipientWallet: `0x${string}` } =>
				draftWithRecipientWallet(d),
		);
		if (groupLegs.length === 0) continue;

		const first = groupLegs[0];
		if (
			!args.canUseAdvancedSettlements &&
			(isAdvancedSettlementReleaseType(first.releaseType) || groups.length > 1)
		) {
			throw new Error("These payout options need Teams Pro or Enterprise.");
		}

		rules.push(ruleGroupToSettlementRule(groupLegs, args.recipients));
	}

	return rules;
}
