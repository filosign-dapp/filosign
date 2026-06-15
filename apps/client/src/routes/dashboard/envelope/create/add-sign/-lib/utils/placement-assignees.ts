import { normalizePlacementRecipientEmail } from "@filosign/shared";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import { isValidRecipientEmail } from "@/src/lib/domains/invites/recipient-email";
import {
	resolveSelfSignerOnRoster,
	type SelfProfileForRoster,
} from "@/src/lib/domains/placement/utils/self-signer";
import { createClientId } from "@/src/lib/utils/id";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import { signerEmailsFromRecipients } from "@/src/routes/dashboard/envelope/create/-lib/utils/routing-turn-order";

export function signerEmailsForPlacementManifest(args: {
	signerRecipients: Recipient[];
	signatureFields: SignatureField[];
}): string[] {
	const rosterEmails = signerEmailsFromRecipients(args.signerRecipients);
	const seen = new Set(rosterEmails);
	for (const field of args.signatureFields) {
		const assigned = normalizePlacementRecipientEmail(
			field.assignedSignerEmail,
		);
		if (seen.has(assigned)) continue;
		// Only extend the list when the assigned email is already a roster signer.
		if (rosterEmails.includes(assigned)) {
			seen.add(assigned);
		}
	}
	return rosterEmails;
}

export function fieldsWithUnknownSignerEmails(args: {
	signatureFields: SignatureField[];
	signerRecipients: Recipient[];
}): SignatureField[] {
	const roster = new Set(signerEmailsFromRecipients(args.signerRecipients));
	return args.signatureFields.filter(
		(field) =>
			!roster.has(normalizePlacementRecipientEmail(field.assignedSignerEmail)),
	);
}

export function hasAutoAddedSelfRecipient(recipients: Recipient[]): boolean {
	return recipients.some((r) => r.isAutoAddedSelf === true);
}

export function isSelfSignEnabled(
	recipients: Recipient[],
	selfProfile: SelfProfileForRoster | null | undefined,
): boolean {
	if (hasAutoAddedSelfRecipient(recipients)) return true;
	return resolveSelfSignerOnRoster(recipients, selfProfile) != null;
}

export function buildAutoAddedSelfRecipient(
	profile: SelfProfileForRoster,
): Recipient | null {
	const rawEmail = profile.email?.trim();
	if (!rawEmail || !isValidRecipientEmail(rawEmail)) return null;
	const email = normalizePlacementRecipientEmail(rawEmail);
	const name =
		[profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
		"Me";
	const wallet = profile.walletAddress?.trim();
	return {
		clientRowId: createClientId(),
		name,
		email,
		...(wallet ? { walletAddress: wallet } : {}),
		role: "signer",
		signerRequired: true,
		isAutoAddedSelf: true,
	};
}

export function upsertAutoAddedSelfRecipient(
	recipients: Recipient[],
	profile: SelfProfileForRoster,
): Recipient[] | null {
	const selfRecipient = buildAutoAddedSelfRecipient(profile);
	if (!selfRecipient) return null;

	const withoutAuto = recipients.filter((r) => !r.isAutoAddedSelf);
	if (resolveSelfSignerOnRoster(withoutAuto, profile)) {
		return withoutAuto;
	}
	return [...withoutAuto, selfRecipient];
}

export function removeAutoAddedSelfRecipients(
	recipients: Recipient[],
): Recipient[] {
	return recipients.filter((r) => !r.isAutoAddedSelf);
}

export function selfAssignedFieldIds(
	signatureFields: SignatureField[],
	selfEmail: string,
): string[] {
	const normalized = normalizePlacementRecipientEmail(selfEmail);
	return signatureFields
		.filter(
			(field) =>
				normalizePlacementRecipientEmail(field.assignedSignerEmail) ===
				normalized,
		)
		.map((field) => field.id);
}

export function senderHasManifestAssignedFields(args: {
	placementManifest:
		| { fields: { assignedRecipientEmail: string }[] }
		| null
		| undefined;
	signerEmail: string | null | undefined;
}): boolean {
	if (!args.placementManifest || !args.signerEmail?.trim()) return false;
	const normalized = normalizePlacementRecipientEmail(args.signerEmail);
	return args.placementManifest.fields.some(
		(field) => field.assignedRecipientEmail === normalized,
	);
}
