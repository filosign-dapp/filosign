import { throwAppError } from "@filosign/errors/server";
import {
	AUTO_FIELD_TYPES,
	CHECKBOX_FIELD_TYPES,
	type FieldCompletion,
	type FieldCompletionMap,
	type FieldCompletionWireRow,
	fieldCompletionMapFromInput,
	type PlacementField,
	TEXT_FIELD_TYPES,
	VISUAL_FIELD_TYPES,
	zFieldCompletionInputMap,
} from "@filosign/shared";
import { eq } from "drizzle-orm";
import db from "@/lib/platform/db";
import { presignObjectPreviewGet } from "@/lib/platform/s3/presign-preview";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

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

		const completion = fieldCompletions[field.id];
		if (!completion || completion.fieldId !== field.id) {
			throw throwAppError("SIGNING.FIELD_COMPLETION_MISSING");
		}

		if ((VISUAL_FIELD_TYPES as readonly string[]).includes(field.type)) {
			if (completion.valueKind !== "visual" || !completion.storageKey) {
				throw throwAppError("SIGNING.FIELD_VISUAL_REQUIRED");
			}
			continue;
		}

		if ((AUTO_FIELD_TYPES as readonly string[]).includes(field.type)) {
			if (completion.valueKind !== "auto" || !completion.textValue?.trim()) {
				throw throwAppError("SIGNING.FIELD_AUTO_REQUIRED");
			}
			continue;
		}

		if ((TEXT_FIELD_TYPES as readonly string[]).includes(field.type)) {
			if (completion.valueKind !== "text" || !completion.textValue?.trim()) {
				throw throwAppError("SIGNING.FIELD_TEXT_REQUIRED");
			}
			continue;
		}

		if ((CHECKBOX_FIELD_TYPES as readonly string[]).includes(field.type)) {
			if (completion.valueKind !== "checkbox") {
				throw throwAppError("SIGNING.FIELD_CHECKBOX_REQUIRED");
			}
		}
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
