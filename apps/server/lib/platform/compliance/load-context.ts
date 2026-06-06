import type { PlacementManifest } from "@filosign/shared";
import { zPlacementManifest } from "@filosign/shared";
import { eq } from "drizzle-orm";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import { loadSettlementRecipientAcksForPiece } from "@/lib/domains/settlement-access/utils/recipient-ack";
import type db from "@/lib/platform/db";
import {
	fileAcknowledgements,
	fileColdInvites,
	fileDocumentViews,
	fileSignatures,
	fileSignerAmendments,
	fileSignerDrafts,
	files,
} from "@/lib/platform/db/schema/file";
import { fileSettlementRules } from "@/lib/platform/db/schema/settlements";
import { users } from "@/lib/platform/db/schema/user";
import { loadOnchainRegistration } from "./load-onchain-registration";
import type { ParticipantRow } from "./types";

export type ComplianceLoadContext = {
	pieceCid: string;
	participantRows: ParticipantRow[];
	fileRecord: {
		sender: Address;
		onchainTxHash: Hex;
		registryAddress: Address;
		createdAt: Date;
		placementCommitment: Hex;
		documentSha256: Hex;
		placementManifestJson: PlacementManifest;
		revokedBeforeCompletedAt: Date | null;
		revokedBy: Address | null;
		completedAt: Date | null;
		revokeOnchainTxHash: Hex | null;
	};
	manifest: PlacementManifest;
	sigRows: {
		signer: Address;
		onchainTxHash: Hex;
		createdAt: Date;
		completedFieldIds: string[];
		completionsRoot: Hex | null;
		leafSchemaVersion: number | null;
		requestIp: string | null;
		requestUserAgent: string | null;
	}[];
	draftByWallet: Map<string, string[]>;
	sigByWallet: Map<string, ComplianceLoadContext["sigRows"][number]>;
	ackRowsRaw: {
		wallet: Address;
		ackCreatedAt: Date;
		acknowledgedAt: Date;
		intentVersion: string;
		ack: string;
		email: string | null;
		authProviderId: string | null;
	}[];
	viewRowsRaw: {
		wallet: Address;
		firstViewedAt: Date;
		source: "sign_page" | "file_viewer" | "inbox";
	}[];
	coldInviteClaimRows: {
		email: string;
		wallet: Address;
		claimedAt: Date;
		isSigner: boolean;
	}[];
	onchainRegistration: import("@filosign/shared").ComplianceBundle["onchainRegistration"];
	executionStatus: "fully_executed" | "partially_executed";
	exportedAtIso: string;
	senderNorm: Address;
	settlementRows: {
		onChainRuleId: bigint;
		legs: import("@filosign/shared").SettlementPayoutLegInput[];
		tokenAddress: Address;
		validatorAddress: Address;
		releaseType: string;
		status: string;
		registerRuleTxHash: Hex;
		approveTxHash: Hex;
		payoutTxHash: Hex | null;
		executedAt: Date | null;
		lastError: string | null;
	}[];
	amendmentRows: {
		oldCommitment: Hex;
		newCommitment: Hex;
		status: string;
		proposeTxHash: Hex;
		executeTxHash: Hex | null;
		cancelTxHash: Hex | null;
		createdAt: Date;
	}[];
	settlementRecipientAckRows: {
		signerWallet: Address;
		termsVersion: string;
		acknowledgedAt: Date;
	}[];
};

export async function loadComplianceContext(args: {
	db: typeof db;
	pieceCid: string;
	participantRows: ParticipantRow[];
}): Promise<ComplianceLoadContext> {
	const { db: database, pieceCid, participantRows } = args;

	const [fileRecord] = await database
		.select({
			sender: files.sender,
			onchainTxHash: files.onchainTxHash,
			registryAddress: files.registryAddress,
			createdAt: files.createdAt,
			placementCommitment: files.placementCommitment,
			documentSha256: files.documentSha256,
			placementManifestJson: files.placementManifestJson,
			revokedBeforeCompletedAt: files.revokedBeforeCompletedAt,
			revokedBy: files.revokedBy,
			completedAt: files.completedAt,
			revokeOnchainTxHash: files.revokeOnchainTxHash,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	if (!fileRecord) {
		throw new Error("File not found");
	}

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new Error("Invalid placement manifest on file record");
	}
	const manifest = manifestParsed.data;

	const sigRows = await database
		.select({
			signer: fileSignatures.signer,
			onchainTxHash: fileSignatures.onchainTxHash,
			createdAt: fileSignatures.createdAt,
			completedFieldIds: fileSignatures.completedFieldIds,
			completionsRoot: fileSignatures.completionsRoot,
			leafSchemaVersion: fileSignatures.leafSchemaVersion,
			requestIp: fileSignatures.requestIp,
			requestUserAgent: fileSignatures.requestUserAgent,
		})
		.from(fileSignatures)
		.where(eq(fileSignatures.filePieceCid, pieceCid));

	const draftRows = await database
		.select({
			wallet: fileSignerDrafts.wallet,
			completedFieldIds: fileSignerDrafts.completedFieldIds,
		})
		.from(fileSignerDrafts)
		.where(eq(fileSignerDrafts.filePieceCid, pieceCid));

	const ackRowsRaw = await database
		.select({
			wallet: fileAcknowledgements.wallet,
			ackCreatedAt: fileAcknowledgements.createdAt,
			acknowledgedAt: fileAcknowledgements.acknowledgedAt,
			intentVersion: fileAcknowledgements.intentVersion,
			ack: fileAcknowledgements.ack,
			email: users.email,
			authProviderId: users.authProviderId,
		})
		.from(fileAcknowledgements)
		.innerJoin(users, eq(fileAcknowledgements.wallet, users.walletAddress))
		.where(eq(fileAcknowledgements.filePieceCid, pieceCid));

	const viewRowsRaw = await database
		.select({
			wallet: fileDocumentViews.wallet,
			firstViewedAt: fileDocumentViews.firstViewedAt,
			source: fileDocumentViews.source,
		})
		.from(fileDocumentViews)
		.where(eq(fileDocumentViews.filePieceCid, pieceCid));

	const coldInviteClaimRowsRaw = await database
		.select({
			email: fileColdInvites.email,
			wallet: fileColdInvites.claimedByWallet,
			claimedAt: fileColdInvites.claimedAt,
			isSigner: fileColdInvites.isSigner,
		})
		.from(fileColdInvites)
		.where(eq(fileColdInvites.filePieceCid, pieceCid));

	const coldInviteClaimRows = coldInviteClaimRowsRaw
		.filter((r) => r.wallet != null && r.claimedAt != null)
		.map((r) => ({
			email: r.email,
			wallet: getAddress(r.wallet as Address),
			claimedAt: r.claimedAt as Date,
			isSigner: r.isSigner,
		}));

	const draftByWallet = new Map(
		draftRows.map((d) => [
			getAddress(d.wallet).toLowerCase(),
			d.completedFieldIds,
		]),
	);

	const sigRowsNormalized = sigRows.map((s) => ({
		signer: getAddress(s.signer),
		onchainTxHash: s.onchainTxHash as Hex,
		createdAt: s.createdAt,
		completedFieldIds: s.completedFieldIds,
		completionsRoot: s.completionsRoot as Hex | null,
		leafSchemaVersion: s.leafSchemaVersion,
		requestIp: s.requestIp,
		requestUserAgent: s.requestUserAgent,
	}));

	const sigByWallet = new Map(
		sigRowsNormalized.map((s) => [s.signer.toLowerCase(), s]),
	);

	const signerParticipants = participantRows.filter((p) => p.role === "signer");
	const totalSigners = signerParticipants.length;
	const signedCount = signerParticipants.filter((p) =>
		sigByWallet.has(getAddress(p.wallet).toLowerCase()),
	).length;

	const executionStatus =
		totalSigners > 0 && signedCount === totalSigners
			? ("fully_executed" as const)
			: ("partially_executed" as const);

	const exportedAtIso = new Date().toISOString();
	const senderNorm = getAddress(fileRecord.sender);
	const onchainRegistration = await loadOnchainRegistration({
		pieceCid,
		registryAddress: fileRecord.registryAddress,
	});

	const settlementRowsRaw = await database
		.select({
			onChainRuleId: fileSettlementRules.onChainRuleId,
			legs: fileSettlementRules.legs,
			tokenAddress: fileSettlementRules.tokenAddress,
			validatorAddress: fileSettlementRules.validatorAddress,
			releaseType: fileSettlementRules.releaseType,
			status: fileSettlementRules.status,
			registerRuleTxHash: fileSettlementRules.registerRuleTxHash,
			approveTxHash: fileSettlementRules.approveTxHash,
			payoutTxHash: fileSettlementRules.payoutTxHash,
			executedAt: fileSettlementRules.executedAt,
			lastError: fileSettlementRules.lastError,
		})
		.from(fileSettlementRules)
		.where(eq(fileSettlementRules.pieceCid, pieceCid));

	const amendmentRowsRaw = await database
		.select({
			oldCommitment: fileSignerAmendments.oldCommitment,
			newCommitment: fileSignerAmendments.newCommitment,
			status: fileSignerAmendments.status,
			proposeTxHash: fileSignerAmendments.proposeTxHash,
			executeTxHash: fileSignerAmendments.executeTxHash,
			cancelTxHash: fileSignerAmendments.cancelTxHash,
			createdAt: fileSignerAmendments.createdAt,
		})
		.from(fileSignerAmendments)
		.where(eq(fileSignerAmendments.filePieceCid, pieceCid));

	const settlementRows = settlementRowsRaw.map((r) => ({
		onChainRuleId: r.onChainRuleId,
		legs: r.legs,
		tokenAddress: getAddress(r.tokenAddress),
		validatorAddress: getAddress(r.validatorAddress),
		releaseType: r.releaseType,
		status: r.status,
		registerRuleTxHash: r.registerRuleTxHash as Hex,
		approveTxHash: r.approveTxHash as Hex,
		payoutTxHash: r.payoutTxHash ? (r.payoutTxHash as Hex) : null,
		executedAt: r.executedAt,
		lastError: r.lastError,
	}));

	const amendmentRows = amendmentRowsRaw.map((r) => ({
		oldCommitment: r.oldCommitment as Hex,
		newCommitment: r.newCommitment as Hex,
		status: r.status,
		proposeTxHash: r.proposeTxHash as Hex,
		executeTxHash: r.executeTxHash ? (r.executeTxHash as Hex) : null,
		cancelTxHash: r.cancelTxHash ? (r.cancelTxHash as Hex) : null,
		createdAt: r.createdAt,
	}));

	const settlementRecipientAckRows = (
		await loadSettlementRecipientAcksForPiece(pieceCid)
	).map((r) => ({
		signerWallet: getAddress(r.signerWallet),
		termsVersion: r.termsVersion,
		acknowledgedAt: r.acknowledgedAt,
	}));

	return {
		pieceCid,
		participantRows,
		fileRecord: {
			sender: fileRecord.sender,
			onchainTxHash: fileRecord.onchainTxHash as Hex,
			registryAddress: fileRecord.registryAddress,
			createdAt: fileRecord.createdAt,
			placementCommitment: fileRecord.placementCommitment as Hex,
			documentSha256: fileRecord.documentSha256 as Hex,
			placementManifestJson: fileRecord.placementManifestJson,
			revokedBeforeCompletedAt: fileRecord.revokedBeforeCompletedAt,
			revokedBy: fileRecord.revokedBy ? getAddress(fileRecord.revokedBy) : null,
			completedAt: fileRecord.completedAt,
			revokeOnchainTxHash:
				(fileRecord.revokeOnchainTxHash as Hex | null) ?? null,
		},
		manifest,
		sigRows: sigRowsNormalized,
		draftByWallet,
		sigByWallet,
		ackRowsRaw,
		viewRowsRaw: viewRowsRaw.map((r) => ({
			wallet: getAddress(r.wallet),
			firstViewedAt: r.firstViewedAt,
			source: r.source,
		})),
		coldInviteClaimRows,
		onchainRegistration,
		executionStatus,
		exportedAtIso,
		senderNorm,
		settlementRows,
		amendmentRows,
		settlementRecipientAckRows,
	};
}
