import { throwAppError } from "@filosign/errors/server";
import {
	AUTO_FIELD_TYPES,
	CHECKBOX_FIELD_TYPES,
	type FieldCompletion,
	type FieldCompletionMap,
	type FieldCompletionWireRow,
	type PlacementField,
	TEXT_FIELD_TYPES,
	VISUAL_FIELD_TYPES,
	zFieldCompletion,
	zFieldCompletionMap,
} from "@filosign/shared";
import { eq } from "drizzle-orm";
import { z } from "zod";
import db from "@/lib/platform/db";
import { bucket } from "@/lib/platform/s3/client";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

const { fileFieldCompletions } = db.schema;

const PREVIEW_TTL_SECONDS = 60 * 15;

export function parseFieldCompletionMap(raw: unknown): FieldCompletionMap {
	const parsed = zFieldCompletionMap.safeParse(raw ?? {});
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}
	return parsed.data;
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

export const zPieceSignFieldCompletionsBody = z.record(
	z.string(),
	zFieldCompletion.omit({ previewUrl: true }),
);

async function presignCompletionPreview(
	storageKey: string | null | undefined,
): Promise<string | null> {
	if (!storageKey) return null;
	try {
		return bucket.presign(storageKey, {
			method: "GET",
			expiresIn: PREVIEW_TTL_SECONDS,
		});
	} catch {
		return null;
	}
}

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
			previewUrl: await presignCompletionPreview(row.storageKey),
		})),
	);
}
