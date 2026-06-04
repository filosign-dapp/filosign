import { zComplianceBundle, zPlacementManifest } from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
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
	canSignByRouting: z.boolean().optional(),
});

const envelopeProgressSchema = z.object({
	routingMode: z.number().int(),
	requiredSignersCount: z.number().int(),
	requiredSignaturesCount: z.number().int(),
	quorumN: z.number().int(),
	completedAt: z.number().int().nullable().optional(),
	revokedBeforeCompletedAt: z.number().int().nullable().optional(),
	revokedBy: zEvmAddress().nullable().optional(),
	nextSignerEmail: z.string().nullable(),
	signerReplacementPending: z.boolean().optional(),
});

export const rpcPieceDetailOutputSchema = z.object({
	pieceCid: z.string(),
	sender: z.string(),
	registryAddress: zHexString(),
	status: z.literal("s3"),
	onchainTxHash: zHexString(),
	createdAt: z.union([z.string(), z.date()]),
	placementCommitment: zHexString(),
	placementManifest: zPlacementManifest.nullable(),
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
	envelopeProgress: envelopeProgressSchema.nullable().optional(),
	pendingSignerReplacement: z
		.object({
			oldCommitment: zHexString(),
			newCommitment: zHexString(),
			proposeTxHash: zHexString(),
			createdAt: z.union([z.string(), z.date()]),
		})
		.nullable()
		.optional(),
	conditionalAttachmentPackets: z
		.array(
			z.object({
				packetId: z.string(),
				label: z.string().nullable(),
				onChainRuleId: z.string(),
				releaseContractAddress: zHexString(),
				released: z.boolean(),
				cancelled: z.boolean(),
			}),
		)
		.optional(),
	mySupplementaryPackets: z
		.array(
			z.object({
				packetId: z.string(),
				label: z.string().nullable(),
				releaseMode: z.enum(["review", "conditional"]),
				unlocked: z.boolean(),
				cancelled: z.boolean(),
				unlockConditionLabel: z.string(),
				canDecrypt: z.boolean(),
			}),
		)
		.optional(),
	kemCiphertext: zHexString().nullable(),
	encryptedEncryptionKey: zHexString().nullable(),
	organizationId: z.uuid().nullable().optional(),
	orgKemCiphertext: zHexString().nullable().optional(),
	orgEncryptedEncryptionKey: zHexString().nullable().optional(),
	focStatus: z
		.object({
			lifecycle: z.enum(["active", "pending_deletion", "deleted"]),
			replicateStatus: z.enum(["pending", "replicated"]),
			retentionUntil: z.string(),
			focVerifiedAt: z.string().nullable(),
			dealId: z.string().nullable(),
		})
		.nullable()
		.optional(),
	latestComplianceExport: z
		.object({
			exportKind: z.enum(["zip", "pdf", "json"]),
			createdAt: z.string(),
			documentSha256: z.string().nullable(),
		})
		.nullable()
		.optional(),
});

export type RpcPieceDetailOutput = z.output<typeof rpcPieceDetailOutputSchema>;

export const rpcPieceAckOutputSchema = z.object({});

export const rpcPieceRecordViewOutputSchema = z.object({
	firstViewedAt: z.string(),
	source: z.enum(["sign_page", "file_viewer", "inbox"]),
});

export const rpcPieceSignDraftFieldIdsOutputSchema = z.object({
	completedFieldIds: z.array(z.string()),
});

export const rpcPieceDownloadUrlOutputSchema = z.object({
	presignedUrl: z.string(),
});

export const rpcPieceComplianceBundleOutputSchema = z.object({
	exportId: z.uuid(),
	bundleHash: zHexString(),
	bundle: zComplianceBundle,
});

export const rpcPieceSignOutputSchema = z.object({
	txHash: zHexString(),
	signature: zHexString(),
});
