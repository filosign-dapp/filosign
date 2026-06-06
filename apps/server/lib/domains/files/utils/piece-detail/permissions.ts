import type { FieldCompletionWireRow } from "@filosign/shared";
import { zPlacementManifest } from "@filosign/shared";
import type { Hash, Hex } from "viem";
import type { RpcPieceDetailOutput } from "@/api/orpc/schemas/files-piece-output";
import type { SupplementaryPacketForParticipant } from "@/lib/domains/attachments/attachments";
import type { getOrgMemberWithDocumentRead } from "@/lib/domains/orgs";
import db from "@/lib/platform/db";
import type {
	EnvelopeRegistryProgress,
	listConditionalAttachmentPacketsForSender,
} from "../piece-helpers";
import type { ParticipantRow } from "./access";

const { files, focObjects } = db.schema;

type ConditionalAttachmentPacketRow = Awaited<
	ReturnType<typeof listConditionalAttachmentPacketsForSender>
>[number];

type PieceDetailFileRecord = Pick<
	typeof files.$inferSelect,
	| "pieceCid"
	| "registryAddress"
	| "sender"
	| "status"
	| "onchainTxHash"
	| "createdAt"
	| "placementCommitment"
	| "placementManifestJson"
	| "metadataJson"
	| "organizationId"
	| "orgKemCiphertext"
	| "orgEncryptedEncryptionKey"
>;

type PieceDetailFocRow = Pick<
	typeof focObjects.$inferSelect,
	| "lifecycle"
	| "replicateStatus"
	| "retentionUntil"
	| "focVerifiedAt"
	| "dealId"
>;

type PieceDetailResponseCore = Omit<RpcPieceDetailOutput, "metadata">;

type PieceDetailSignatureRow = {
	signer: PieceDetailFileRecord["sender"];
	timestamp: Date;
	onchainTxHash: Hex;
};

type PendingSignerReplacementRow = {
	oldCommitment: Hash;
	newCommitment: Hash;
	proposeTxHash: Hash;
	createdAt: Date;
};

type OrgDocumentReadAccess = Awaited<
	ReturnType<typeof getOrgMemberWithDocumentRead>
>;

export type PieceDetailPermissions = {
	isSigner: boolean;
	canDecryptParticipant: boolean;
	canReadOrg: boolean;
	acknowledged: boolean;
	acknowledgedAt: string | null;
	firstViewedAt: string | null;
	canSign: boolean;
	canSignByRouting: boolean;
	signerReplacementBlocksSign: boolean;
	manifestUnlocked: boolean;
};

export function computePieceDetailPermissions(args: {
	participantUser: Pick<ParticipantRow, "role"> | undefined;
	isSender: boolean;
	mySignature: PieceDetailSignatureRow | undefined;
	senderHasAssignedFields: boolean;
	validAck: { acknowledgedAt: Date } | null;
	documentView: { firstViewedAt: Date } | null;
	envelopeProgress: EnvelopeRegistryProgress | null;
	pendingSignerReplacement: PendingSignerReplacementRow | null;
	orgRead: OrgDocumentReadAccess;
}): PieceDetailPermissions {
	const acknowledged = Boolean(args.validAck);
	const acknowledgedAt = args.validAck?.acknowledgedAt.toISOString() ?? null;
	const firstViewedAt = args.documentView?.firstViewedAt.toISOString() ?? null;

	const isSigner =
		(args.participantUser?.role === "signer" &&
			!args.isSender &&
			!args.mySignature) ||
		(args.isSender && args.senderHasAssignedFields && !args.mySignature);

	const canDecryptParticipant =
		Boolean(args.participantUser) && (args.isSender || Boolean(args.validAck));
	const canReadOrg = Boolean(args.orgRead);

	const canSignByRouting = args.envelopeProgress?.canSignByRouting ?? true;
	const signerReplacementBlocksSign = Boolean(args.pendingSignerReplacement);
	const canSign = Boolean(
		isSigner &&
			(args.isSender || (acknowledged && firstViewedAt)) &&
			!args.mySignature &&
			canSignByRouting &&
			!signerReplacementBlocksSign,
	);

	const manifestUnlocked =
		args.isSender ||
		canReadOrg ||
		(args.participantUser?.role === "signer"
			? acknowledged && Boolean(firstViewedAt)
			: acknowledged);

	return {
		isSigner,
		canDecryptParticipant,
		canReadOrg,
		acknowledged,
		acknowledgedAt,
		firstViewedAt,
		canSign,
		canSignByRouting,
		signerReplacementBlocksSign,
		manifestUnlocked,
	};
}

export function buildPieceDetailResponse(args: {
	fileRecord: PieceDetailFileRecord;
	participantUser:
		| Pick<ParticipantRow, "kemCiphertext" | "encryptedEncryptionKey">
		| undefined;
	permissions: PieceDetailPermissions;
	signers: Array<{
		wallet: PieceDetailFileRecord["sender"];
		name: string | null;
		email: string | null;
	}>;
	viewers: Array<{
		wallet: PieceDetailFileRecord["sender"];
		name: string | null;
		email: string | null;
	}>;
	fileSignaturesRecord: Array<{
		signer: PieceDetailFileRecord["sender"];
		timestamp: Date;
		onchainTxHash: Hex;
	}>;
	envelopeProgress: EnvelopeRegistryProgress | null;
	pendingSignerReplacement: PendingSignerReplacementRow | null;
	conditionalAttachmentPackets?: ConditionalAttachmentPacketRow[];
	mySupplementaryPackets: SupplementaryPacketForParticipant[];
	focRow: PieceDetailFocRow | undefined;
	latestExport:
		| {
				exportKind: "zip" | "pdf" | "json";
				createdAt: Date;
				documentSha256: string;
		  }
		| undefined;
	commentsFeatureEnabled: boolean;
	hasSenderComments: boolean;
	fieldCompletions?: FieldCompletionWireRow[];
	isSender: boolean;
}): PieceDetailResponseCore {
	const p = args.permissions;
	return {
		pieceCid: args.fileRecord.pieceCid,
		registryAddress: args.fileRecord.registryAddress,
		sender: args.fileRecord.sender,
		status: args.fileRecord.status,
		onchainTxHash: args.fileRecord.onchainTxHash,
		createdAt: args.fileRecord.createdAt,
		placementCommitment: args.fileRecord.placementCommitment,
		placementManifest: p.manifestUnlocked
			? zPlacementManifest.parse(args.fileRecord.placementManifestJson)
			: null,
		signers: args.signers,
		viewers: args.viewers,
		signatures: args.fileSignaturesRecord,
		participantAccess: {
			acknowledged: p.acknowledged,
			acknowledgedAt: p.acknowledgedAt,
			firstViewedAt: p.firstViewedAt,
			canDecrypt:
				p.canDecryptParticipant ||
				p.canReadOrg ||
				(args.isSender && Boolean(args.participantUser)),
			canSign: p.canSign,
			canSignByRouting: p.canSignByRouting,
		},
		envelopeProgress: args.envelopeProgress
			? {
					routingMode: args.envelopeProgress.routingMode,
					requiredSignersCount: args.envelopeProgress.requiredSignersCount,
					requiredSignaturesCount:
						args.envelopeProgress.requiredSignaturesCount,
					quorumN: args.envelopeProgress.quorumN,
					completedAt: args.envelopeProgress.completedAt,
					revokedBeforeCompletedAt:
						args.envelopeProgress.revokedBeforeCompletedAt,
					revokedBy: args.envelopeProgress.revokedBy,
					nextSignerEmail: args.envelopeProgress.nextSignerEmail,
					signerReplacementPending: p.signerReplacementBlocksSign,
				}
			: null,
		pendingSignerReplacement: args.pendingSignerReplacement
			? {
					oldCommitment: args.pendingSignerReplacement.oldCommitment,
					newCommitment: args.pendingSignerReplacement.newCommitment,
					proposeTxHash: args.pendingSignerReplacement.proposeTxHash,
					createdAt: args.pendingSignerReplacement.createdAt,
				}
			: null,
		...(args.conditionalAttachmentPackets
			? { conditionalAttachmentPackets: args.conditionalAttachmentPackets }
			: {}),
		...(args.mySupplementaryPackets.length > 0
			? { mySupplementaryPackets: args.mySupplementaryPackets }
			: {}),
		kemCiphertext:
			p.canDecryptParticipant && args.participantUser
				? args.participantUser.kemCiphertext
				: null,
		encryptedEncryptionKey:
			p.canDecryptParticipant && args.participantUser
				? args.participantUser.encryptedEncryptionKey
				: null,
		orgKemCiphertext: p.canReadOrg ? args.fileRecord.orgKemCiphertext : null,
		orgEncryptedEncryptionKey: p.canReadOrg
			? args.fileRecord.orgEncryptedEncryptionKey
			: null,
		organizationId:
			p.canReadOrg || args.isSender ? args.fileRecord.organizationId : null,
		focStatus: args.focRow
			? {
					lifecycle: args.focRow.lifecycle,
					replicateStatus: args.focRow.replicateStatus,
					retentionUntil: args.focRow.retentionUntil.toISOString(),
					focVerifiedAt: args.focRow.focVerifiedAt?.toISOString() ?? null,
					dealId: args.focRow.dealId,
				}
			: null,
		latestComplianceExport: args.latestExport
			? {
					exportKind: args.latestExport.exportKind,
					createdAt: args.latestExport.createdAt.toISOString(),
					documentSha256: args.latestExport.documentSha256,
				}
			: null,
		commentsFeatureEnabled: args.commentsFeatureEnabled,
		hasSenderComments: args.hasSenderComments,
		...(args.fieldCompletions
			? { fieldCompletions: args.fieldCompletions }
			: {}),
	} satisfies PieceDetailResponseCore;
}
