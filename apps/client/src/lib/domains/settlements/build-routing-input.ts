import type { RegisterRoutingInput } from "@filosign/shared";
import {
	normalizePlacementRecipientEmail,
	usesAdvancedRegisterRouting,
} from "@filosign/shared";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import { isValidRecipientEmail } from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";

export function buildRegisterRoutingFromForm(args: {
	recipients: Recipient[];
	routing?: RegisterRoutingInput;
}): RegisterRoutingInput | undefined {
	const optionalSignerEmails = args.recipients
		.filter((r) => r.role === "signer" && r.signerRequired === false)
		.map((r) => r.email.trim())
		.filter((email) => isValidRecipientEmail(email))
		.map((email) => normalizePlacementRecipientEmail(email));

	const routing: RegisterRoutingInput = {
		...args.routing,
		...(optionalSignerEmails.length > 0 ? { optionalSignerEmails } : {}),
	};

	return usesAdvancedRegisterRouting(routing) ? routing : undefined;
}
