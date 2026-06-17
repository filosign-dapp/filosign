import { normalizePlacementRecipientEmail } from "@filosign/shared";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements";
export type PayoutRuleGroup = {
	ruleId: string;
	legs: SettlementAttachmentDraft[];
};

export function ruleIdForDraft(draft: SettlementAttachmentDraft): string {
	return draft.ruleId ?? draft.id;
}

export function getRuleGroups(
	drafts: SettlementAttachmentDraft[],
): PayoutRuleGroup[] {
	const map = new Map<string, SettlementAttachmentDraft[]>();
	for (const draft of drafts.filter((d) => d.recipientClientRowId)) {
		const key = ruleIdForDraft(draft);
		const group = map.get(key) ?? [];
		group.push(draft);
		map.set(key, group);
	}
	return Array.from(map.entries()).map(([ruleId, legs]) => ({ ruleId, legs }));
}

export function getDraftsByRuleId(
	drafts: SettlementAttachmentDraft[],
	ruleId: string,
): SettlementAttachmentDraft[] {
	return drafts.filter((d) => ruleIdForDraft(d) === ruleId);
}

export function getDraftForRecipient(
	drafts: SettlementAttachmentDraft[],
	clientRowId: string,
): SettlementAttachmentDraft | undefined {
	return drafts.find((d) => d.recipientClientRowId === clientRowId);
}

export function upsertRuleDrafts(
	drafts: SettlementAttachmentDraft[],
	ruleId: string,
	nextLegs: SettlementAttachmentDraft[],
): SettlementAttachmentDraft[] {
	const withoutRule = drafts.filter((d) => ruleIdForDraft(d) !== ruleId);
	return [...withoutRule, ...nextLegs];
}

export function removeDraftForRecipient(
	drafts: SettlementAttachmentDraft[],
	clientRowId: string,
): SettlementAttachmentDraft[] {
	return drafts.filter((d) => d.recipientClientRowId !== clientRowId);
}

export function removeDraftsByRuleId(
	drafts: SettlementAttachmentDraft[],
	ruleId: string,
): SettlementAttachmentDraft[] {
	return drafts.filter((d) => ruleIdForDraft(d) !== ruleId);
}

export function recipientSettlementLabel(recipient: Recipient): string {
	const email = recipient.email?.trim();
	const name = recipient.name?.trim();
	if (name && email) return `${name} (${email})`;
	return name || email || "Recipient";
}

export function buildLegDraftFromRecipient(
	recipient: Recipient,
	args: {
		ruleId: string;
		amountUsdc: string;
		releaseType: SettlementAttachmentDraft["releaseType"];
		specificSignerEmail?: string;
		thresholdN?: number;
		expiresAtUnix?: number;
		id?: string;
	},
): SettlementAttachmentDraft | null {
	const clientRowId = recipient.clientRowId;
	const rawEmail = recipient.email?.trim();
	if (!clientRowId || !rawEmail) return null;

	return {
		id: args.id ?? crypto.randomUUID(),
		ruleId: args.ruleId,
		recipientClientRowId: clientRowId,
		recipientEmail: normalizePlacementRecipientEmail(rawEmail),
		recipientSource: recipient.role === "viewer" ? "viewer" : "signer",
		recipientLabel: recipientSettlementLabel(recipient),
		amountUsdc: args.amountUsdc,
		releaseType: args.releaseType,
		specificSignerEmail: args.specificSignerEmail,
		thresholdN: args.thresholdN,
		expiresAtUnix: args.expiresAtUnix,
	};
}
