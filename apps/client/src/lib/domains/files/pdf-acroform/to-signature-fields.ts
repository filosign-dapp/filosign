import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import type { ActiveAssignee } from "@/src/lib/domains/placement/utils/active-assignees";
import type { DetectedPdfFormField } from "./extract";

export function acroformFieldsToSignatureFields(args: {
	detected: DetectedPdfFormField[];
	documentId: string;
	assignee: ActiveAssignee;
}): SignatureField[] {
	return args.detected.map((field) => ({
		id: crypto.randomUUID(),
		type: field.suggestedType,
		x: Math.round(field.rect.x),
		y: Math.round(field.rect.y),
		width: Math.max(1, Math.round(field.rect.width)),
		height: Math.max(1, Math.round(field.rect.height)),
		page: field.pageIndex + 1,
		documentId: args.documentId,
		assignedSignerWallet: args.assignee.walletAddress,
		assignedSignerName: args.assignee.name,
		assignedSignerEmail: args.assignee.email,
		required: args.assignee.required,
		label: field.pdfFieldName,
	}));
}
