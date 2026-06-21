import { throwAppError } from "@filosign/errors/server";
import {
	systemTemplateDocumentStorageKey,
	type TemplatePlaintextSha256,
} from "@filosign/shared";

export type SystemTemplateStorageProbe = {
	exists(key: string): Promise<boolean>;
};

export const defaultSystemTemplateStorageProbe: SystemTemplateStorageProbe = {
	exists: async (key) => {
		const { bucket } = await import("@/lib/platform/s3/client");
		return bucket.exists(key);
	},
};

export function systemTemplateDocumentS3Key(args: {
	systemTemplateId: string;
	docId: string;
}): string {
	return systemTemplateDocumentStorageKey(args);
}

export async function resolveSystemTemplateDocumentNeedsUpload(args: {
	existingPlaintextSha256: TemplatePlaintextSha256 | undefined;
	requestedPlaintextSha256: TemplatePlaintextSha256;
	s3Key: string;
	probe?: SystemTemplateStorageProbe;
}): Promise<boolean> {
	if (args.existingPlaintextSha256 == null) {
		return true;
	}
	if (args.existingPlaintextSha256 !== args.requestedPlaintextSha256) {
		return true;
	}
	const probe = args.probe ?? defaultSystemTemplateStorageProbe;
	return !(await probe.exists(args.s3Key));
}

export async function assertSystemTemplateDocumentExistsOnS3(args: {
	s3Key: string;
	docId: string;
	probe?: SystemTemplateStorageProbe;
}): Promise<void> {
	const probe = args.probe ?? defaultSystemTemplateStorageProbe;
	if (await probe.exists(args.s3Key)) return;
	throwAppError("FILES.UPLOAD_MISSING");
}

export async function assertSystemTemplateDocumentsExistOnS3(args: {
	documents: Array<{ docId: string; s3Key: string }>;
	probe?: SystemTemplateStorageProbe;
}): Promise<void> {
	for (const doc of args.documents) {
		await assertSystemTemplateDocumentExistsOnS3({
			s3Key: doc.s3Key,
			docId: doc.docId,
			probe: args.probe,
		});
	}
}

async function deleteSystemTemplateS3Keys(keys: string[]): Promise<void> {
	for (const s3Key of keys) {
		const res = await bucketDelete(s3Key);
		if (res.error) {
			console.warn("system template storage delete failed", {
				s3Key,
				error: res.error,
			});
		}
	}
}

async function bucketDelete(s3Key: string): Promise<{ error: Error | null }> {
	const { bucket } = await import("@/lib/platform/s3/client");
	return bucket.delete(s3Key).then(
		() => ({ error: null as Error | null }),
		(error: unknown) => ({ error: error as Error }),
	);
}

export { deleteSystemTemplateS3Keys };
