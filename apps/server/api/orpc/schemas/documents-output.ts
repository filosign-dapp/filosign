import { zEnvelopeMetadata } from "@filosign/shared";
import { zEvmAddress } from "@filosign/shared/zod";
import { z } from "zod";
import { zDateWire } from "./rpc-wire";

export const zDocumentEnvelopeLifecycle = z.enum([
	"active",
	"completed",
	"voided",
]);

export const zDocumentEnvelopeSigningSchema = z.object({
	requiredCount: z.number().int().min(0),
	signedCount: z.number().int().min(0),
});

export const zDocumentEnvelopePartySchema = z.object({
	wallet: zEvmAddress(),
	label: z.string(),
});

export const zDocumentEnvelopeRowSchema = z.object({
	kind: z.literal("envelope"),
	id: z.string(),
	title: z.string(),
	direction: z.enum(["sent", "received"]),
	lifecycle: zDocumentEnvelopeLifecycle,
	updatedAt: zDateWire,
	sizeBytes: z.number().int().nullable(),
	signedByMe: z.boolean(),
	metadata: zEnvelopeMetadata.nullable().optional(),
	signing: zDocumentEnvelopeSigningSchema.optional(),
	party: zDocumentEnvelopePartySchema.optional(),
});

export const zDocumentDraftRowSchema = z.object({
	kind: z.literal("draft"),
	id: z.uuid(),
	title: z.string(),
	updatedAt: zDateWire,
	createdByWallet: zEvmAddress(),
	sizeBytes: z.number().int().nullable(),
});

export const zDocumentListRowSchema = z.discriminatedUnion("kind", [
	zDocumentEnvelopeRowSchema,
	zDocumentDraftRowSchema,
]);

export const rpcDocumentsListOutputSchema = z.object({
	items: z.array(zDocumentListRowSchema),
	nextCursor: z.string().nullable(),
});
