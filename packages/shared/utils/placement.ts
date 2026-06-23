import { jsonStringify } from "@filosign/crypto-utils";
import type { Hex } from "viem";
import { keccak256, stringToBytes } from "viem";
import { z } from "zod";

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

export const zPlacementField = zPlacementFieldBase.extend({
	documentId: z.string().min(1),
});

export const zPlacementDocument = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	sha256Plaintext: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
	pageCount: z.number().int().min(1),
});

/** Committed placement at send (multi-document). */
export const zPlacementManifest = z.object({
	version: z.literal(1),
	documents: z.array(zPlacementDocument).min(1),
	fields: z.array(zPlacementField).min(1),
});

/** Draft checkpoints - fields and document metadata may be incomplete before send. */
export const zDraftPlacementManifest = z.object({
	version: z.literal(1),
	documents: z.array(zPlacementDocument),
	fields: z.array(zPlacementField),
});

export type PlacementManifest = z.infer<typeof zPlacementManifest>;
export type DraftPlacementManifest = z.infer<typeof zDraftPlacementManifest>;
export type PlacementField = z.infer<typeof zPlacementField>;
export type PlacementDocument = z.infer<typeof zPlacementDocument>;

/** Canonical placement editor / sign overlay layout width in px. */
export const PLACEMENT_CANONICAL_LAYOUT_WIDTH = 600;

/** Default page layout height at canonical width (matches desktop viewport fallback). */
export const PLACEMENT_CANONICAL_LAYOUT_HEIGHT = 800;

export function defaultPlacementLayout(): {
	width: number;
	height: number;
} {
	return {
		width: PLACEMENT_CANONICAL_LAYOUT_WIDTH,
		height: PLACEMENT_CANONICAL_LAYOUT_HEIGHT,
	};
}

export function placementFieldPixelRect(
	field: Pick<PlacementField, "rect">,
	layoutWidth: number,
	layoutHeight: number,
): { width: number; height: number } {
	return {
		width: Math.max(1, Math.round(field.rect.width * layoutWidth)),
		height: Math.max(1, Math.round(field.rect.height * layoutHeight)),
	};
}

export function sortKeysDeep(value: unknown): unknown {
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

/** Canonical JSON string for hashing - stable key order. */
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
