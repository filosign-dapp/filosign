import type { RegisterRoutingInput } from "@filosign/shared";
import {
	normalizePlacementRecipientEmail,
	usesAdvancedRegisterRouting,
} from "@filosign/shared";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import { isValidRecipientEmail } from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";

export function deriveOptionalSignerEmailsFromRecipients(
	recipients: Recipient[],
): string[] {
	const optional: string[] = [];
	const seen = new Set<string>();

	for (const recipient of recipients) {
		if (recipient.role !== "signer" || recipient.signerRequired !== false) {
			continue;
		}
		const raw = recipient.email?.trim() ?? "";
		if (!isValidRecipientEmail(raw)) continue;
		const email = normalizePlacementRecipientEmail(raw);
		if (seen.has(email)) continue;
		seen.add(email);
		optional.push(email);
	}

	return optional;
}

export function buildRegisterRoutingFromForm(args: {
	recipients: Recipient[];
	routing?: RegisterRoutingInput;
}): RegisterRoutingInput | undefined {
	const optionalSignerEmails = deriveOptionalSignerEmailsFromRecipients(
		args.recipients,
	);

	const routing: RegisterRoutingInput = {
		...args.routing,
		...(optionalSignerEmails.length > 0 ? { optionalSignerEmails } : {}),
	};

	return usesAdvancedRegisterRouting(routing) ? routing : undefined;
}
