import type { UploadedFile } from "@/src/routes/dashboard/envelope/create/-lib/types";

/** In-memory preview blobs for compose → add-sign (avoids redundant IndexedDB read). */
const cache = new Map<string, UploadedFile[]>();

export function setDraftPreviewCache(
	draftId: string,
	documents: UploadedFile[],
): void {
	cache.set(draftId, documents);
}

export function takeDraftPreviewCache(
	draftId: string,
): UploadedFile[] | undefined {
	const hit = cache.get(draftId);
	if (hit) cache.delete(draftId);
	return hit;
}

export function clearDraftPreviewCache(draftId: string): void {
	cache.delete(draftId);
}
