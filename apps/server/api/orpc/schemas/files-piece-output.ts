import {
	zComplianceBundle,
	zEnvelopeMetadata,
	zFieldCompletionMap,
	zFieldCompletionWireRow,
	zPlacementManifest,
	zSatelliteWorkflowSummary,
} from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { z } from "zod";

const rosterPersonSchema = z.object({
	wallet: z.string(),
	name: z.string().nullable(),
	email: z.string().nullable(),
	invitePending: z.boolean().optional(),
});

const participantAccessSchema = z.object({
	acknowledged: z.boolean(),
	acknowledgedAt: z.string().nullable(),
	firstViewedAt: z.string().nullable(),
	canDecrypt: z.boolean(),
	canSign: z.boolean(),
	canSignByRouting: z.boolean().optional(),
});

export const rpcEnvelopeProgressSchema = z.object({
	routingMode: z.number().int(),
	requiredSignersCount: z.number().int(),
	requiredSignaturesCount: z.number().int(),
	quorumN: z.number().int(),
	completedAt: z.number().int().nullable().optional(),
	revokedBeforeCompletedAt: z.number().int().nullable().optional(),
	revokedBy: zEvmAddress().nullable().optional(),
	nextSignerEmail: z.string().nullable(),
	routingOrderEmails: z.array(z.string()).nullable().optional(),
	signerReplacementPending: z.boolean().optional(),
});

export type RpcEnvelopeProgress = z.infer<typeof rpcEnvelopeProgressSchema>;

const envelopeProgressSchema = rpcEnvelopeProgressSchema;

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
			oldEmail: z.string().nullable().optional(),
			newEmail: z.string().nullable().optional(),
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
	satelliteWorkflowSummary: zSatelliteWorkflowSummary.optional(),
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
	commentsFeatureEnabled: z.boolean(),
	hasSenderComments: z.boolean(),
	metadata: zEnvelopeMetadata.nullable().optional(),
	fieldCompletions: z.array(zFieldCompletionWireRow).optional(),
});

export type RpcPieceDetailOutput = z.infer<typeof rpcPieceDetailOutputSchema>;

export const rpcPieceAckOutputSchema = z.object({});

export const rpcPieceRecordViewOutputSchema = z.object({
	firstViewedAt: z.string(),
	source: z.enum(["sign_page", "file_viewer", "inbox"]),
});

export const rpcPieceSignDraftFieldIdsOutputSchema = z.object({
	completedFieldIds: z.array(z.string()),
	fieldCompletions: zFieldCompletionMap,
});

export const rpcPieceDownloadUrlOutputSchema = z.object({
	presignedUrl: z.string(),
});

export const rpcPieceComplianceBundleOutputSchema = z.object({
	exportId: z.uuid(),
	bundleHash: zHexString(),
	bundleCanonicalJson: z.string().min(1),
	bundle: zComplianceBundle,
});

export const rpcPieceSignOutputSchema = z.object({
	txHash: zHexString(),
	signature: zHexString(),
});
