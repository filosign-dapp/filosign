import { z } from "zod";
import { isValidRecipientEmail } from "@/src/lib/domains/invites/recipient-email";

const uploadedFileSchema = z.object({
	id: z.string(),
	file: z.instanceof(File),
	name: z.string(),
	size: z.number(),
	type: z.string(),
});

const composeRecipientSchema = z.object({
	clientRowId: z.string().optional(),
	name: z.string(),
	email: z.string(),
	walletAddress: z.string().optional(),
	role: z.enum(["signer", "viewer"]),
});

export const composeDocumentsSchema = z
	.array(uploadedFileSchema)
	.min(1, { error: "Please upload at least one document" });

export const composeRecipientsSchema = z
	.array(composeRecipientSchema)
	.min(1, { error: "Please add at least one recipient" })
	.superRefine((recipients, ctx) => {
		const hasInvalidEmail = recipients.some(
			(r) => !isValidRecipientEmail(r.email ?? ""),
		);
		if (hasInvalidEmail) {
			ctx.addIssue({
				code: "custom",
				message: "Enter a valid email for every recipient",
			});
		}
	});
