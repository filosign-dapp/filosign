import {
	SUPPLEMENTARY_ATTACHMENT_LIMITS,
	validateSupplementaryAttachmentFile,
} from "@filosign/shared";
import { attachmentFileByteLength } from "@/src/lib/domains/drafts/envelope-local-draft";

export type AttachmentPacketValidationIssue = {
	code: string;
	message: string;
};

export function validateAttachmentPacketComposeDrafts(args: {
	drafts: {
		files: { name: string; bytes?: Uint8Array; size?: number }[];
		recipientEmails: string[];
	}[];
}): AttachmentPacketValidationIssue[] {
	const issues: AttachmentPacketValidationIssue[] = [];
	for (const [index, draft] of args.drafts.entries()) {
		if (draft.files.length === 0) {
			issues.push({
				code: "EMPTY_PACKET",
				message: `Supplementary packet ${index + 1} has no files`,
			});
		}
		if (
			draft.files.length > SUPPLEMENTARY_ATTACHMENT_LIMITS.maxFilesPerPacket
		) {
			issues.push({
				code: "FILE_LIMIT",
				message: `Supplementary packet ${index + 1} exceeds ${SUPPLEMENTARY_ATTACHMENT_LIMITS.maxFilesPerPacket} files`,
			});
		}
		for (const file of draft.files) {
			const byteLength = attachmentFileByteLength(file);
			if (byteLength === 0) {
				issues.push({
					code: "FILE_BYTES_MISSING",
					message: `${file.name} is still loading. Wait a moment and try again`,
				});
				continue;
			}
			if (byteLength > SUPPLEMENTARY_ATTACHMENT_LIMITS.maxBytesPerFile) {
				issues.push({
					code: "FILE_TOO_LARGE",
					message: `${file.name} exceeds the ${Math.round(SUPPLEMENTARY_ATTACHMENT_LIMITS.maxBytesPerFile / (1024 * 1024))}MB limit`,
				});
				continue;
			}
			const validated = validateSupplementaryAttachmentFile({
				name: file.name,
				sizeBytes: byteLength,
			});
			if (!validated.ok) {
				issues.push({
					code: validated.code,
					message: validated.message,
				});
			}
		}
		if (draft.recipientEmails.length === 0) {
			issues.push({
				code: "NO_RECIPIENTS",
				message: `Supplementary packet ${index + 1} needs at least one recipient`,
			});
		}
	}
	return issues;
}
