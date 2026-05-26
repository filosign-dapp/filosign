import { zComplianceBundle } from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { z } from "zod";

const rosterPersonSchema = z.object({
	wallet: z.string(),
	name: z.string().nullable(),
	email: z.string().nullable(),
});

export const rpcPieceDetailOutputSchema = z.object({
	pieceCid: z.string(),
	sender: z.string(),
	status: z.literal("s3"),
	onchainTxHash: zHexString(),
	createdAt: z.union([z.string(), z.date()]),
	placementCommitment: zHexString(),
	placementManifest: z.unknown(),
	signers: z.array(rosterPersonSchema),
	viewers: z.array(rosterPersonSchema),
	signatures: z.array(
		z.object({
			signer: z.string(),
			timestamp: z.union([z.string(), z.date()]),
			onchainTxHash: zHexString(),
		}),
	),
	kemCiphertext: zHexString().nullable(),
	encryptedEncryptionKey: zHexString().nullable(),
	organizationId: z.string().uuid().nullable().optional(),
	orgKemCiphertext: zHexString().nullable().optional(),
	orgEncryptedEncryptionKey: zHexString().nullable().optional(),
});

export type RpcPieceDetailOutput = z.output<typeof rpcPieceDetailOutputSchema>;

export const rpcPieceAckOutputSchema = z.object({});

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
