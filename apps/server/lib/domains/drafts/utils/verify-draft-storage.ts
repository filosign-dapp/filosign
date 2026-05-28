import { draftDocumentKey, draftSnapshotKey } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { logDraftSave } from "./draft-save-log";

export type DraftStorageProbe = {
	exists(key: string): Promise<boolean>;
};

export const defaultDraftStorageProbe: DraftStorageProbe = {
	exists: async (key) => {
		const { bucket } = await import("@/lib/platform/s3/client");
		return bucket.exists(key);
	},
};

async function existsWithRetry(
	key: string,
	probe: DraftStorageProbe,
	attempts: number,
	delayMs: number,
): Promise<boolean> {
	for (let i = 0; i < attempts; i++) {
		if (await probe.exists(key)) return true;
		if (i < attempts - 1) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}
	return false;
}

export async function assertDraftObjectExists(
	key: string,
	probe: DraftStorageProbe = defaultDraftStorageProbe,
	options?: { attempts?: number; delayMs?: number },
): Promise<void> {
	const attempts = options?.attempts ?? 1;
	const delayMs = options?.delayMs ?? 150;
	const ok = await existsWithRetry(key, probe, attempts, delayMs);
	logDraftSave("s3.exists", { s3Key: key, ok, attempts });
	if (!ok) {
		throw new ORPCError("PRECONDITION_FAILED", {
			message: "Draft storage object is missing; upload before saving",
			data: { s3Key: key },
		});
	}
}

export async function assertDraftDocumentsExistOnS3(args: {
	draftId: string;
	organizationId: string | null;
	docIds: string[];
	probe?: DraftStorageProbe;
	/** Per-docId retry overrides (e.g. 1 when object was not re-uploaded). */
	retryByDocId?: Record<string, { attempts?: number; delayMs?: number }>;
	defaultAttempts?: number;
	defaultDelayMs?: number;
}): Promise<void> {
	const probe = args.probe ?? defaultDraftStorageProbe;
	const defaultAttempts = args.defaultAttempts ?? 2;
	const defaultDelayMs = args.defaultDelayMs ?? 100;

	await Promise.all(
		args.docIds.map(async (docId) => {
			const s3Key = draftDocumentKey({
				draftId: args.draftId,
				organizationId: args.organizationId,
				docId,
			});
			const retry = args.retryByDocId?.[docId];
			const attempts = retry?.attempts ?? defaultAttempts;
			const delayMs = retry?.delayMs ?? defaultDelayMs;
			const ok = await existsWithRetry(s3Key, probe, attempts, delayMs);
			if (!ok) {
				throw new ORPCError("PRECONDITION_FAILED", {
					message: `Document "${docId}" is not uploaded yet. Upload the file before saving.`,
					data: { docId, s3Key },
				});
			}
		}),
	);
}

export async function assertDraftSnapshotExistsOnS3(args: {
	draftId: string;
	organizationId: string | null;
	probe?: DraftStorageProbe;
	attempts?: number;
	delayMs?: number;
}): Promise<void> {
	const s3Key = draftSnapshotKey({
		draftId: args.draftId,
		organizationId: args.organizationId,
	});
	await assertDraftObjectExists(s3Key, args.probe, {
		attempts: args.attempts ?? 2,
		delayMs: args.delayMs ?? 100,
	});
}

export async function draftSnapshotExistsOnS3(args: {
	draftId: string;
	organizationId: string | null;
	probe?: DraftStorageProbe;
}): Promise<boolean> {
	const probe = args.probe ?? defaultDraftStorageProbe;
	const s3Key = draftSnapshotKey({
		draftId: args.draftId,
		organizationId: args.organizationId,
	});
	return probe.exists(s3Key);
}

export async function draftDocumentExistsOnS3(args: {
	draftId: string;
	organizationId: string | null;
	docId: string;
	probe?: DraftStorageProbe;
}): Promise<boolean> {
	const probe = args.probe ?? defaultDraftStorageProbe;
	const s3Key = draftDocumentKey({
		draftId: args.draftId,
		organizationId: args.organizationId,
		docId: args.docId,
	});
	return probe.exists(s3Key);
}
