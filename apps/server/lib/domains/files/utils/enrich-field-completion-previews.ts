import type { FieldCompletionMap } from "@filosign/shared";
import {
	type ObjectPreviewPresigner,
	presignObjectPreviewGet,
} from "@/lib/platform/s3/presign-preview";

/** Presign visual completion previews for read responses (draft GET, signed file detail). */
export async function enrichFieldCompletionMapPreviews(
	map: FieldCompletionMap,
	presign: ObjectPreviewPresigner | undefined = undefined,
): Promise<FieldCompletionMap> {
	let changed = false;
	const out: FieldCompletionMap = {};

	for (const [fieldId, completion] of Object.entries(map)) {
		if (completion.valueKind !== "visual" || completion.previewUrl) {
			out[fieldId] = completion;
			continue;
		}

		const previewUrl = await presignObjectPreviewGet(
			completion.storageKey,
			presign,
		);
		if (!previewUrl) {
			out[fieldId] = completion;
			continue;
		}

		changed = true;
		out[fieldId] = { ...completion, previewUrl };
	}

	return changed ? out : map;
}
