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

export const zPlacementField = z.object({
	id: z.string().min(1),
	pageIndex: z.number().int().min(0),
	rect: zRectNormalized,
	/** Canonical recipient identity for this field (normalized lowercase). */
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

/** Send/sign/compliance — at least one placed field. */
export const zPlacementManifest = z.object({
	version: z.literal(2),
	fields: z.array(zPlacementField).min(1),
});

/** Draft checkpoints — fields may be empty before add-sign placement. */
export const zDraftPlacementManifest = z.object({
	version: z.literal(2),
	fields: z.array(zPlacementField),
});

export type PlacementManifest = z.infer<typeof zPlacementManifest>;
export type DraftPlacementManifest = z.infer<typeof zDraftPlacementManifest>;
export type PlacementField = z.infer<typeof zPlacementField>;

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
): PlacementField[] {
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
