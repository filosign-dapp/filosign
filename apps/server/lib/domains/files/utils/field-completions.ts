import {
	type FieldCompletion,
	type FieldCompletionMap,
	type FieldCompletionWireRow,
	fieldCompletionMapFromInput,
	type PlacementField,
	zFieldCompletionInputMap,
} from "@filosign/shared";
import { eq } from "drizzle-orm";
import db from "@/lib/platform/db";
import { presignObjectPreviewGet } from "@/lib/platform/s3/presign-preview";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { validateSingleFieldCompletion } from "./field-completion-validate";

export { enrichFieldCompletionMapPreviews } from "./enrich-field-completion-previews";

const { fileFieldCompletions } = db.schema;

export function parseFieldCompletionInputMap(raw: unknown): FieldCompletionMap {
	const parsed = zFieldCompletionInputMap.safeParse(raw ?? {});
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}
	return fieldCompletionMapFromInput(parsed.data);
}

export function fieldCompletionForManifestField(
	field: PlacementField,
	completions: FieldCompletionMap,
): FieldCompletion | undefined {
	return completions[field.id];
}

export function validateFieldCompletionsForSigner(args: {
	assignedFields: PlacementField[];
	completedFieldIds: string[];
	fieldCompletions: FieldCompletionMap;
}) {
	const { assignedFields, completedFieldIds, fieldCompletions } = args;
	const completedSet = new Set(completedFieldIds);

	for (const field of assignedFields) {
		if (!completedSet.has(field.id)) continue;
		validateSingleFieldCompletion(field, fieldCompletions[field.id]);
	}
}

/** Presign visual completion previews for read responses (draft GET, signed file detail). */
export async function listPieceFieldCompletions(
	pieceCid: string,
): Promise<FieldCompletionWireRow[]> {
	const rows = await db
		.select()
		.from(fileFieldCompletions)
		.where(eq(fileFieldCompletions.filePieceCid, pieceCid));

	return Promise.all(
		rows.map(async (row) => ({
			fieldId: row.fieldId,
			signer: row.signer,
			valueKind: row.valueKind,
			sourceArtifactId: row.sourceArtifactId,
			storageKey: row.storageKey,
			contentSha256: row.contentSha256,
			textValue: row.textValue,
			previewUrl: await presignObjectPreviewGet(row.storageKey),
		})),
	);
}
