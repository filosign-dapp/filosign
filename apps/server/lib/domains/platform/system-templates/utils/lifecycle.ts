import { throwAppError } from "@filosign/errors/server";
import {
	type SystemTemplateStatus,
	systemTemplateDocumentStorageKey,
} from "@filosign/shared";

export function assertSystemTemplatePublishable(args: {
	status: SystemTemplateStatus;
	documentCount: number;
}): void {
	if (args.status === "archived") {
		throwAppError("PLATFORM.SYSTEM_TEMPLATE_NOT_PUBLISHABLE");
	}
	if (args.documentCount === 0) {
		throwAppError("PLATFORM.SYSTEM_TEMPLATE_EMPTY");
	}
}

export function assertSystemTemplateDeletable(
	status: SystemTemplateStatus,
): void {
	if (status === "published") {
		throwAppError("PLATFORM.SYSTEM_TEMPLATE_DELETE_FORBIDDEN");
	}
}

export function assertSystemTemplateDocumentKeys(args: {
	systemTemplateId: string;
	documents: Array<{ docId: string; s3Key: string }>;
}): void {
	for (const doc of args.documents) {
		const expected = systemTemplateDocumentStorageKey({
			systemTemplateId: args.systemTemplateId,
			docId: doc.docId,
		});
		if (doc.s3Key !== expected) {
			throwAppError("PLATFORM.SYSTEM_TEMPLATE_INVALID_DOCUMENT_KEY", {
				params: { docId: doc.docId },
			});
		}
	}
}
