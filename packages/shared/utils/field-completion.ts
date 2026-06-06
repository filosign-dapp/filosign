import { z } from "zod";
import { typedSignatureArtifactPreviewSrc } from "./render-typed-signature-svg";
import type { UserSignatureArtifact } from "./signature-artifact";
import { zContentSha256Hex } from "./signature-artifact";

export const zFieldValueKind = z.enum(["visual", "text", "checkbox", "auto"]);

export const zFieldCompletion = z.object({
	fieldId: z.string().min(1),
	valueKind: zFieldValueKind,
	sourceArtifactId: z.uuid().nullable(),
	storageKey: z.string().nullable(),
	contentSha256: zContentSha256Hex.nullable(),
	textValue: z.string().nullable(),
	previewUrl: z.string().nullable(),
});

/** Client → server sign/draft payloads (previewUrl is presigned server-side). */
export const zFieldCompletionInput = zFieldCompletion.omit({
	previewUrl: true,
});

export const zFieldCompletionMap = z.record(z.string(), zFieldCompletion);

export const zFieldCompletionInputMap = z.record(
	z.string(),
	zFieldCompletionInput,
);

export const zFieldCompletionWireRow = zFieldCompletion.extend({
	signer: z.string().optional(),
});

export type FieldValueKind = z.infer<typeof zFieldValueKind>;
export type FieldCompletion = z.infer<typeof zFieldCompletion>;
export type FieldCompletionInput = z.infer<typeof zFieldCompletionInput>;
export type FieldCompletionMap = z.infer<typeof zFieldCompletionMap>;
export type FieldCompletionInputMap = z.infer<typeof zFieldCompletionInputMap>;
export type FieldCompletionWireRow = z.infer<typeof zFieldCompletionWireRow>;

export function fieldCompletionFromInput(
	input: FieldCompletionInput,
): FieldCompletion {
	return { ...input, previewUrl: null };
}

export function fieldCompletionMapFromInput(
	input: FieldCompletionInputMap,
): FieldCompletionMap {
	const out: FieldCompletionMap = {};
	for (const [fieldId, completion] of Object.entries(input)) {
		out[fieldId] = fieldCompletionFromInput(completion);
	}
	return out;
}

export function fieldCompletionInputFromStored(
	completion: FieldCompletion,
): FieldCompletionInput {
	return {
		fieldId: completion.fieldId,
		valueKind: completion.valueKind,
		sourceArtifactId: completion.sourceArtifactId,
		storageKey: completion.storageKey,
		contentSha256: completion.contentSha256,
		textValue: completion.textValue,
	};
}

export function fieldCompletionInputMapFromStored(
	map: FieldCompletionMap,
): FieldCompletionInputMap {
	const out: FieldCompletionInputMap = {};
	for (const [fieldId, completion] of Object.entries(map)) {
		out[fieldId] = fieldCompletionInputFromStored(completion);
	}
	return out;
}

function resolveSignatureArtifactForCompletion(
	completion: FieldCompletion,
	signatures: readonly UserSignatureArtifact[],
): UserSignatureArtifact | undefined {
	if (completion.sourceArtifactId) {
		const byId = signatures.find(
			(row) => row.id === completion.sourceArtifactId,
		);
		if (byId) return byId;
	}
	if (completion.storageKey) {
		return signatures.find((row) => row.storageKey === completion.storageKey);
	}
	return undefined;
}

/** Restore client preview URLs after draft hydrate (wire payloads omit presigned URLs). */
export function enrichVisualCompletionPreview(
	completion: FieldCompletion,
	signatures: readonly UserSignatureArtifact[],
): FieldCompletion {
	if (completion.valueKind !== "visual" || completion.previewUrl) {
		return completion;
	}

	const artifact = resolveSignatureArtifactForCompletion(
		completion,
		signatures,
	);
	if (!artifact) return completion;

	const previewUrl =
		artifact.previewUrl ?? typedSignatureArtifactPreviewSrc({ artifact });
	if (!previewUrl) return completion;

	return { ...completion, previewUrl };
}

export function enrichFieldCompletionMap(
	map: FieldCompletionMap,
	signatures: readonly UserSignatureArtifact[],
): FieldCompletionMap {
	let changed = false;
	const out: FieldCompletionMap = {};
	for (const [fieldId, completion] of Object.entries(map)) {
		const next = enrichVisualCompletionPreview(completion, signatures);
		out[fieldId] = next;
		if (next !== completion) changed = true;
	}
	return changed ? out : map;
}

export const VISUAL_FIELD_TYPES = ["signature", "initial"] as const;
export const AUTO_FIELD_TYPES = ["date", "name", "email"] as const;
export const TEXT_FIELD_TYPES = ["text"] as const;
export const CHECKBOX_FIELD_TYPES = ["checkbox"] as const;
