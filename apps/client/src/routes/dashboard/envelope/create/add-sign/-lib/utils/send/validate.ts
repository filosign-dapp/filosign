import {
	findSignerEmailMissingRequiredSignatureField,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import type { Address } from "viem";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import { isValidRecipientEmail } from "@/src/lib/domains/invites/recipient-email";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements";
import { settlementPayoutExceedsBalance } from "@/src/lib/domains/settlements";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import { fieldsWithUnknownSignerEmails } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-assignees";
import type { EnvelopeSendValidationFailure } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/validation-types";
import {
	isColdRecipient,
	type RecipientWithEncryptionProfile,
	recipientResolvedSignerAddress,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope";

export type { EnvelopeSendValidationFailure } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/validation-types";

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
			...TOASTS.send.orphanFields(orphanEmail),
		};
	}

	const placementFields = signatureFields.map((field) => ({
		assignedRecipientEmail: normalizePlacementRecipientEmail(
			field.assignedSignerEmail,
		),
		type: field.type,
		required: field.required,
	}));
	const signerEmails = signerRecipients.map((signer) =>
		normalizePlacementRecipientEmail(signer.email?.trim() ?? ""),
	);

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
				...TOASTS.send.missingFieldsForSigner(signerEmail),
			};
		}
	}

	const missingRequiredSignature = findSignerEmailMissingRequiredSignatureField(
		placementFields,
		signerEmails,
	);
	if (missingRequiredSignature) {
		return {
			kind: "toast",
			...TOASTS.send.missingRequiredSignatureForSigner(
				missingRequiredSignature,
			),
		};
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

export function validateSettlementPayoutBalance(args: {
	settlementDrafts: SettlementAttachmentDraft[] | undefined;
	walletAddress: `0x${string}` | undefined;
	walletBalance: bigint;
}): EnvelopeSendValidationFailure | null {
	if (
		!settlementPayoutExceedsBalance({
			drafts: args.settlementDrafts ?? [],
			walletAddress: args.walletAddress,
			walletBalance: args.walletBalance,
		})
	) {
		return null;
	}

	return {
		kind: "toast",
		...TOASTS.send.payoutExceedsBalance,
	};
}

export function reportEnvelopeSendValidationFailure(
	failure: EnvelopeSendValidationFailure,
): void {
	if (failure.kind !== "toast") return;
	if (failure.title) {
		toastUser.error(failure.title, { hint: failure.hint });
		return;
	}
	if (failure.message) {
		toastUser.error(failure.message);
	}
}

export function collectColdRecipients(recipients: Recipient[]): Recipient[] {
	return recipients.filter(isColdRecipient);
}

export function rosterEmailsFromRecipients(recipients: Recipient[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const recipient of recipients) {
		const raw = recipient.email?.trim();
		if (!raw || !isValidRecipientEmail(raw)) continue;
		const email = normalizePlacementRecipientEmail(raw);
		if (seen.has(email)) continue;
		seen.add(email);
		out.push(email);
	}
	return out;
}
