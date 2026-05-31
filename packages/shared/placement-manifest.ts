import { jsonStringify } from "@filosign/crypto-utils";
import type { Hex } from "viem";
import { keccak256, stringToBytes } from "viem";
import z from "zod";

/** Normalized coordinates on the page (0–1). */
export const zRectNormalized = z.object({
	x: z.number().min(0).max(1),
	y: z.number().min(0).max(1),
	width: z.number().min(0).max(1),
	height: z.number().min(0).max(1),
});

export function normalizePlacementRecipientEmail(email: string): string {
	return email.trim().toLowerCase();
}

export const zPlacementFieldBase = z.object({
	id: z.string().min(1),
	pageIndex: z.number().int().min(0),
	rect: zRectNormalized,
	assignedRecipientEmail: z
		.email()
		.transform((e) => normalizePlacementRecipientEmail(e)),
	required: z.boolean(),
	type: z.enum([
		"signature",
		"initial",
		"date",
		"name",
		"email",
		"text",
		"checkbox",
	]),
});

/** Legacy v2 field (single-doc envelopes). */
export const zPlacementFieldV2 = zPlacementFieldBase;

/** v3 field — pageIndex is per document. */
export const zPlacementFieldV3 = zPlacementFieldBase.extend({
	documentId: z.string().min(1),
});

export const zPlacementDocument = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	sha256Plaintext: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
	pageCount: z.number().int().min(1),
});

/** Legacy single-doc manifest. */
export const zPlacementManifestV2 = z.object({
	version: z.literal(2),
	fields: z.array(zPlacementFieldV2).min(1),
});

/** Multi-document manifest (committed at send). */
export const zPlacementManifestV3 = z.object({
	version: z.literal(3),
	documents: z.array(zPlacementDocument).min(1),
	fields: z.array(zPlacementFieldV3).min(1),
});

export const zPlacementManifest = z.discriminatedUnion("version", [
	zPlacementManifestV2,
	zPlacementManifestV3,
]);

/** Draft checkpoints — fields may be empty before add-sign placement. */
export const zDraftPlacementManifest = z.discriminatedUnion("version", [
	z.object({
		version: z.literal(2),
		fields: z.array(zPlacementFieldV2),
	}),
	z.object({
		version: z.literal(3),
		documents: z.array(zPlacementDocument),
		fields: z.array(zPlacementFieldV3),
	}),
]);

export type PlacementManifest = z.infer<typeof zPlacementManifest>;
export type PlacementManifestV3 = z.infer<typeof zPlacementManifestV3>;
export type DraftPlacementManifest = z.infer<typeof zDraftPlacementManifest>;
export type PlacementField = z.infer<typeof zPlacementFieldV3>;
export type PlacementDocument = z.infer<typeof zPlacementDocument>;

function sortKeysDeep(value: unknown): unknown {
	if (value === null || typeof value !== "object") {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(sortKeysDeep);
	}
	const obj = value as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(obj).sort()) {
		sorted[key] = sortKeysDeep(obj[key]);
	}
	return sorted;
}

/** Canonical JSON string for hashing — stable key order. */
export function canonicalPlacementManifestJson(
	manifest: PlacementManifest,
): string {
	const parsed = zPlacementManifest.parse(manifest);
	return jsonStringify(sortKeysDeep(parsed) as PlacementManifest);
}

export function computePlacementCommitment(manifest: PlacementManifest): Hex {
	return keccak256(stringToBytes(canonicalPlacementManifestJson(manifest)));
}

export function fieldIdsForRecipientEmail(
	manifest: PlacementManifest,
	recipientEmail: string,
): Array<PlacementManifest["fields"][number]> {
	const key = normalizePlacementRecipientEmail(recipientEmail);
	return manifest.fields.filter((f) => f.assignedRecipientEmail === key);
}

/** Distinct field ids assigned to this recipient email that are marked required. */
export function requiredFieldIdsForRecipientEmail(
	manifest: PlacementManifest,
	recipientEmail: string,
): string[] {
	return fieldIdsForRecipientEmail(manifest, recipientEmail)
		.filter((f) => f.required)
		.map((f) => f.id);
}

export function isPlacementManifestV3(
	manifest: PlacementManifest,
): manifest is PlacementManifestV3 {
	return manifest.version === 3;
}
