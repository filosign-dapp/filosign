import type { EntitlementsSnapshot } from "@filosign/react/billing";
import {
	canSelectSupplementaryRecipients,
	canUseConditionalAttachmentRelease,
	canUseSupplementaryAttachments,
} from "@filosign/react/files";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { toast } from "sonner";
import type { Address } from "viem";
import type { AttachmentPacketComposeDraft } from "@/src/lib/domains/files/attachment-packet-compose";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import {
	validateAttachmentPacketComposeDrafts,
	validateAttachmentPacketDraftsForSend,
} from "@/src/lib/domains/files/validate-attachment-packets";
import { isValidRecipientEmail } from "@/src/lib/domains/invites/recipient-email";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import { fieldsWithUnknownSignerEmails } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-assignees";
import {
	isColdRecipient,
	type RecipientWithEncryptionProfile,
	recipientResolvedSignerAddress,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope";

export type EnvelopeSendValidationFailure = {
	kind: "silent" | "toast";
	message?: string;
};

export function validateEnvelopeDocuments(
	documents: { id: string }[] | undefined,
): EnvelopeSendValidationFailure | null {
	if (!documents?.length) return { kind: "silent" };
	return null;
}

export function validateEnvelopeRecipients(
	recipients: Recipient[] | undefined,
): EnvelopeSendValidationFailure | null {
	if (!recipients?.length) return { kind: "silent" };

	const signerRecipients = recipients.filter((r) => r.role === "signer");
	if (signerRecipients.length === 0) return { kind: "silent" };

	const unresolvedSignerEmails = signerRecipients.filter(
		(r) => !r.email?.trim(),
	);
	if (unresolvedSignerEmails.length > 0) return { kind: "silent" };

	const requiredSignerRecipients = signerRecipients.filter(
		(s) => s.role === "signer",
	);
	if (requiredSignerRecipients.length === 0) return { kind: "silent" };

	return null;
}

export function validateSignerPlacementFields(args: {
	signatureFields: SignatureField[];
	signerRecipients: Recipient[];
}): EnvelopeSendValidationFailure | null {
	const { signatureFields, signerRecipients } = args;

	const orphanFields = fieldsWithUnknownSignerEmails({
		signatureFields,
		signerRecipients,
	});
	if (orphanFields.length > 0) {
		const orphanEmail = normalizePlacementRecipientEmail(
			orphanFields[0]?.assignedSignerEmail ?? "",
		);
		return {
			kind: "toast",
			message: `Fields assigned to ${orphanEmail} are not on this envelope's signer list. Add yourself as a signer on the form page, or reassign those fields.`,
		};
	}

	for (const signer of signerRecipients) {
		const signerEmail = normalizePlacementRecipientEmail(
			signer.email?.trim() ?? "",
		);
		const signerFields = signatureFields.filter(
			(f) =>
				normalizePlacementRecipientEmail(f.assignedSignerEmail) === signerEmail,
		);
		if (signerFields.length === 0) {
			return {
				kind: "toast",
				message: `Add at least one field for required signer ${signerEmail}.`,
			};
		}
		if (!signerFields.some((f) => f.required)) {
			return { kind: "silent" };
		}
	}

	return null;
}

export function validateRecipientProfiles(args: {
	recipients: Recipient[];
	recipientProfilesMapWithRecipient: Map<
		Address,
		{ recipient: Recipient; profile: RecipientWithEncryptionProfile["profile"] }
	>;
	recipientProfilesLoading: boolean;
}): EnvelopeSendValidationFailure | null {
	if (args.recipientProfilesLoading) return { kind: "silent" };

	const missingProfiles = args.recipients.filter((r) => {
		const addr = recipientResolvedSignerAddress(r);
		if (!addr) return false;
		return !args.recipientProfilesMapWithRecipient.has(addr);
	});
	if (missingProfiles.length > 0) return { kind: "silent" };

	return null;
}

export function validateAttachmentPacketsForSend(args: {
	entitlements: EntitlementsSnapshot | undefined;
	attachmentComposeDrafts: AttachmentPacketComposeDraft[];
	rosterEmails: string[];
}): EnvelopeSendValidationFailure | null {
	if (args.attachmentComposeDrafts.length === 0) return null;

	const attachmentIssues = [
		...validateAttachmentPacketDraftsForSend({
			supplementaryAttachments: canUseSupplementaryAttachments(
				args.entitlements,
			),
			recipientSelect: canSelectSupplementaryRecipients(args.entitlements),
			conditionalRelease: canUseConditionalAttachmentRelease(args.entitlements),
			drafts: args.attachmentComposeDrafts,
			rosterEmails: args.rosterEmails,
		}),
		...validateAttachmentPacketComposeDrafts({
			drafts: args.attachmentComposeDrafts,
		}),
	];
	if (attachmentIssues.length > 0) {
		return {
			kind: "toast",
			message: attachmentIssues[0]?.message ?? "Invalid supplementary files",
		};
	}

	return null;
}

export function reportEnvelopeSendValidationFailure(
	failure: EnvelopeSendValidationFailure,
): void {
	if (failure.kind === "toast" && failure.message) {
		toast.error(failure.message);
	}
}

export function collectColdRecipients(recipients: Recipient[]): Recipient[] {
	return recipients.filter(isColdRecipient);
}

export function rosterEmailsFromRecipients(recipients: Recipient[]): string[] {
	return recipients
		.map((r) => r.email?.trim())
		.filter((email): email is string =>
			Boolean(email && isValidRecipientEmail(email)),
		)
		.map((email) => normalizePlacementRecipientEmail(email));
}
