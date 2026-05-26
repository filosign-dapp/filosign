import { z } from "zod";
import { zPlacementManifest } from "./placement-manifest";

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
	placementManifest: zPlacementManifest,
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
