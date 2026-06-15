import { throwAppError } from "@filosign/errors/server";
import {
	type TemplatePlaintextSha256,
	templateDocumentStorageKey,
} from "@filosign/shared";

export type TemplateStorageProbe = {
	exists(key: string): Promise<boolean>;
};

export const defaultTemplateStorageProbe: TemplateStorageProbe = {
	exists: async (key) => {
		const { bucket } = await import("@/lib/platform/s3/client");
		return bucket.exists(key);
	},
};

export function templateDocumentS3Key(args: {
	organizationId: string;
	templateId: string;
	docId: string;
}): string {
	return templateDocumentStorageKey(args);
}

export async function templateDocumentExistsOnS3(args: {
	organizationId: string;
	templateId: string;
	docId: string;
	probe?: TemplateStorageProbe;
}): Promise<boolean> {
	const probe = args.probe ?? defaultTemplateStorageProbe;
	const s3Key = templateDocumentS3Key(args);
	return probe.exists(s3Key);
}

export async function resolveTemplateDocumentNeedsUpload(args: {
	existingPlaintextSha256: TemplatePlaintextSha256 | undefined;
	requestedPlaintextSha256: TemplatePlaintextSha256;
	s3Key: string;
	probe?: TemplateStorageProbe;
}): Promise<boolean> {
	if (args.existingPlaintextSha256 == null) {
		return true;
	}
	if (args.existingPlaintextSha256 !== args.requestedPlaintextSha256) {
		return true;
	}
	const probe = args.probe ?? defaultTemplateStorageProbe;
	return !(await probe.exists(args.s3Key));
}

export async function assertTemplateDocumentExistsOnS3(args: {
	s3Key: string;
	docId: string;
	probe?: TemplateStorageProbe;
}): Promise<void> {
	const probe = args.probe ?? defaultTemplateStorageProbe;
	if (await probe.exists(args.s3Key)) return;
	throwAppError("FILES.UPLOAD_MISSING");
}

export async function assertTemplateDocumentsExistOnS3(args: {
	documents: Array<{ docId: string; s3Key: string }>;
	probe?: TemplateStorageProbe;
}): Promise<void> {
	for (const doc of args.documents) {
		await assertTemplateDocumentExistsOnS3({
			s3Key: doc.s3Key,
			docId: doc.docId,
			probe: args.probe,
		});
	}
}
