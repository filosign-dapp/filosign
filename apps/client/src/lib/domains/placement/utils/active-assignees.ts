import {
	isTemplateRolePlaceholderEmail,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import { isValidRecipientEmail } from "@/src/lib/domains/invites/recipient-email";
import { SELF_ASSIGNEE_ID } from "@/src/lib/domains/placement/utils/placement-coordinates";
import { recipientResolvedSignerAddress } from "@/src/lib/domains/placement/utils/recipient-address";
import { resolveSelfSignerOnRoster } from "@/src/lib/domains/placement/utils/self-signer";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";

export type ActiveAssignee = {
	id: string;
	email: string;
	name: string;
	walletAddress: string;
	isSelf: boolean;
	required: boolean;
	/** False when "Me" is shown but self is not on the signer roster yet. */
	placementEnabled: boolean;
};

function signerRequiredFromRecipient(recipient: Recipient): boolean {
	return recipient.role === "signer";
}

export function countFieldsByAssignee(
	fields: SignatureField[],
	assignees: ActiveAssignee[],
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const assignee of assignees) {
		counts.set(assignee.id, 0);
	}
	for (const field of fields) {
		const email = normalizePlacementRecipientEmail(field.assignedSignerEmail);
		const assignee = assignees.find((a) => a.email === email);
		if (!assignee) continue;
		counts.set(assignee.id, (counts.get(assignee.id) ?? 0) + 1);
	}
	return counts;
}

export function buildActiveAssignees(
	recipients: Recipient[],
	selfProfile:
		| { email?: string | null; walletAddress?: string | null }
		| null
		| undefined,
): ActiveAssignee[] {
	const out: ActiveAssignee[] = [];

	const selfOnRoster = resolveSelfSignerOnRoster(recipients, selfProfile);
	const profileEmail = selfProfile?.email?.trim()
		? normalizePlacementRecipientEmail(selfProfile.email)
		: null;

	if (profileEmail) {
		const rosterAddr = selfOnRoster
			? recipientResolvedSignerAddress(selfOnRoster.recipient)
			: null;
		out.push({
			id: SELF_ASSIGNEE_ID,
			email: selfOnRoster?.email ?? profileEmail,
			name: "Me",
			walletAddress: rosterAddr ?? selfProfile?.walletAddress?.trim() ?? "",
			isSelf: true,
			required: selfOnRoster
				? signerRequiredFromRecipient(selfOnRoster.recipient)
				: true,
			placementEnabled: Boolean(selfOnRoster),
		});
	}

	for (const r of recipients) {
		if (r.role !== "signer") continue;
		const raw = r.email?.trim();
		if (!raw || !isValidRecipientEmail(raw)) continue;
		const email = normalizePlacementRecipientEmail(raw);
		if (out.some((a) => a.email === email)) continue;
		const addr = recipientResolvedSignerAddress(r);
		const trimmedName = r.name?.trim();
		const displayName =
			trimmedName || (isTemplateRolePlaceholderEmail(email) ? "Signer" : email);
		out.push({
			id: email,
			email,
			name: displayName,
			walletAddress: addr ?? "",
			isSelf: false,
			required: signerRequiredFromRecipient(r),
			placementEnabled: true,
		});
	}

	return out;
}

export function resolveActiveAssignee(
	assignees: ActiveAssignee[],
	activeAssigneeId: string,
): ActiveAssignee | null {
	return (
		assignees.find((a) => a.id === activeAssigneeId) ?? assignees[0] ?? null
	);
}
