/** PDF bytes from last server hydrate — avoids IDB read before first paint. */
const hydratedPdfBytesByLocalDraftId = new Map<
	string,
	Record<string, Uint8Array>
>();

export function setHydratedDraftPreviewPdfBytes(
	localDraftId: string,
	pdfBytes: Record<string, Uint8Array>,
): void {
	hydratedPdfBytesByLocalDraftId.set(localDraftId, pdfBytes);
}

export function takeHydratedDraftPreviewPdfBytes(
	localDraftId: string,
): Record<string, Uint8Array> | undefined {
	const hit = hydratedPdfBytesByLocalDraftId.get(localDraftId);
	if (hit) hydratedPdfBytesByLocalDraftId.delete(localDraftId);
	return hit;
}

export function clearHydratedDraftPreviewPdfBytes(localDraftId: string): void {
	hydratedPdfBytesByLocalDraftId.delete(localDraftId);
}
