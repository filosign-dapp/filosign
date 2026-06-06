import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { isValidRecipientEmail } from "@/src/lib/domains/invites/recipient-email";
import { createClientId } from "@/src/lib/utils/id";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import type { SignatureField } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import { recipientResolvedSignerAddress } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope";

export type SelfProfileForRoster = {
	email?: string | null;
	walletAddress?: string | null;
	firstName?: string | null;
	lastName?: string | null;
};

export function signerEmailsFromRecipients(recipients: Recipient[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const recipient of recipients) {
		if (recipient.role !== "signer") continue;
		const raw = recipient.email?.trim();
		if (!raw || !isValidRecipientEmail(raw)) continue;
		const email = normalizePlacementRecipientEmail(raw);
		if (seen.has(email)) continue;
		seen.add(email);
		out.push(email);
	}
	return out;
}

/** Self as a signer on the envelope roster (email or wallet match). */
export function resolveSelfSignerOnRoster(
	recipients: Recipient[],
	selfProfile:
		| { email?: string | null; walletAddress?: string | null }
		| null
		| undefined,
): { email: string; recipient: Recipient } | null {
	if (!selfProfile) return null;

	const selfEmail = selfProfile.email?.trim()
		? normalizePlacementRecipientEmail(selfProfile.email)
		: null;
	const selfWallet = selfProfile.walletAddress?.trim()?.toLowerCase() ?? null;

	for (const recipient of recipients) {
		if (recipient.role !== "signer") continue;
		const raw = recipient.email?.trim();
		if (!raw || !isValidRecipientEmail(raw)) continue;
		const email = normalizePlacementRecipientEmail(raw);
		const wallet =
			recipientResolvedSignerAddress(recipient)?.toLowerCase() ?? null;

		if (selfEmail && email === selfEmail) {
			return { email, recipient };
		}
		if (selfWallet && wallet === selfWallet) {
			return { email, recipient };
		}
	}

	return null;
}

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
