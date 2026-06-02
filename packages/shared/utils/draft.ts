import { jsonStringify } from "@filosign/crypto-utils";
import type { Hex } from "viem";
import { keccak256, stringToBytes } from "viem";
import { z } from "zod";
import { sortKeysDeep, zDraftPlacementManifest } from "./placement";

const zRecipient = z.object({
	clientRowId: z.string().optional(),
	name: z.string(),
	email: z.string(),
	walletAddress: z.string().optional(),
	role: z.enum(["signer", "viewer"]),
});

const zSignatureField = z.object({
	id: z.string(),
	type: z.enum([
		"signature",
		"initial",
		"date",
		"name",
		"email",
		"text",
		"checkbox",
	]),
	x: z.number(),
	y: z.number(),
	page: z.number(),
	documentId: z.string(),
	assignedSignerWallet: z.string(),
	assignedSignerName: z.string(),
	assignedSignerEmail: z.string(),
	required: z.boolean(),
	label: z.string().optional(),
});

const zSettlementDraft = z
	.object({
		id: z.string(),
		recipientClientRowId: z.string(),
		recipientEmail: z.string(),
		recipientSource: z.string(),
		recipientLabel: z.string(),
		recipientWallet: z.string().optional(),
		amountUsdc: z.string(),
		releaseType: z.string(),
		specificSignerEmail: z.string().optional(),
		thresholdN: z.number().optional(),
	})
	.passthrough();

export const zDraftSnapshot = z.object({
	recipients: z.array(zRecipient),
	emailSubject: z.string(),
	emailMessage: z.string(),
	signatureFields: z.array(zSignatureField),
	settlementDrafts: z.array(zSettlementDraft).default([]),
	placementManifest: zDraftPlacementManifest,
	documents: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			size: z.number(),
			type: z.string(),
		}),
	),
});

export type DraftSnapshot = z.infer<typeof zDraftSnapshot>;

/** Canonical JSON for draft snapshot hashing — stable key order. */
export function canonicalDraftSnapshotJson(snapshot: DraftSnapshot): string {
	const parsed = zDraftSnapshot.parse(snapshot);
	return jsonStringify(sortKeysDeep(parsed) as DraftSnapshot);
}

export function digestDraftSnapshot(snapshot: DraftSnapshot): Hex {
	return keccak256(stringToBytes(canonicalDraftSnapshotJson(snapshot)));
}

export function draftStoragePrefix(args: {
	draftId: string;
	organizationId: string | null;
}): string {
	const scope = args.organizationId ?? "personal";
	return `drafts/${scope}/${args.draftId}`;
}

export function draftSnapshotKey(args: {
	draftId: string;
	organizationId: string | null;
}): string {
	return `${draftStoragePrefix(args)}/snapshot.bin`;
}

export function draftDocumentKey(args: {
	draftId: string;
	organizationId: string | null;
	docId: string;
}): string {
	return `${draftStoragePrefix(args)}/${args.docId}.bin`;
}
