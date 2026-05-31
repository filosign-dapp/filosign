import { zComplianceBundle } from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { z } from "zod";

const rosterPersonSchema = z.object({
	wallet: z.string(),
	name: z.string().nullable(),
	email: z.string().nullable(),
});

const participantAccessSchema = z.object({
	acknowledged: z.boolean(),
	acknowledgedAt: z.string().nullable(),
	firstViewedAt: z.string().nullable(),
	canDecrypt: z.boolean(),
	canSign: z.boolean(),
});

export const rpcPieceDetailOutputSchema = z.object({
	pieceCid: z.string(),
	sender: z.string(),
	registryAddress: zHexString(),
	status: z.literal("s3"),
	onchainTxHash: zHexString(),
	createdAt: z.union([z.string(), z.date()]),
	placementCommitment: zHexString(),
	placementManifest: z.unknown().nullable(),
	signers: z.array(rosterPersonSchema),
	viewers: z.array(rosterPersonSchema),
	signatures: z.array(
		z.object({
			signer: z.string(),
			timestamp: z.union([z.string(), z.date()]),
			onchainTxHash: zHexString(),
		}),
	),
	participantAccess: participantAccessSchema,
	kemCiphertext: zHexString().nullable(),
	encryptedEncryptionKey: zHexString().nullable(),
	organizationId: z.string().uuid().nullable().optional(),
	orgKemCiphertext: zHexString().nullable().optional(),
	orgEncryptedEncryptionKey: zHexString().nullable().optional(),
});

export type RpcPieceDetailOutput = z.output<typeof rpcPieceDetailOutputSchema>;

export const rpcPieceAckOutputSchema = z.object({});

export const rpcPieceRecordViewOutputSchema = z.object({
	firstViewedAt: z.string(),
	lastViewedAt: z.string(),
	viewCount: z.number().int().min(1),
});

export const rpcPieceSignDraftFieldIdsOutputSchema = z.object({
	completedFieldIds: z.array(z.string()),
});

export const rpcPieceDownloadUrlOutputSchema = z.object({
	presignedUrl: z.string(),
});

export const rpcPieceComplianceBundleOutputSchema = z.object({
	exportId: z.string().uuid(),
	bundleHash: zHexString(),
	bundle: zComplianceBundle,
});

export const rpcPieceSignOutputSchema = z.object({
	txHash: zHexString(),
	signature: zHexString(),
});
