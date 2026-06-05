import { z } from "zod";
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

export const zFieldCompletionMap = z.record(z.string(), zFieldCompletion);

export const zFieldCompletionWireRow = zFieldCompletion.extend({
	signer: z.string().optional(),
});

export type FieldValueKind = z.infer<typeof zFieldValueKind>;
export type FieldCompletion = z.infer<typeof zFieldCompletion>;
export type FieldCompletionMap = z.infer<typeof zFieldCompletionMap>;
export type FieldCompletionWireRow = z.infer<typeof zFieldCompletionWireRow>;

export const VISUAL_FIELD_TYPES = ["signature", "initial"] as const;
export const AUTO_FIELD_TYPES = ["date", "name", "email"] as const;
export const TEXT_FIELD_TYPES = ["text"] as const;
export const CHECKBOX_FIELD_TYPES = ["checkbox"] as const;
