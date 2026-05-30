import type { PlacementManifest } from "@filosign/shared";
import { zPlacementManifest } from "@filosign/shared";
import { eq } from "drizzle-orm";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
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
import { fsFileRegistryAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
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
		placementManifestJson: unknown;
	};
	manifest: PlacementManifest;
	sigRows: {
		signer: Address;
		onchainTxHash: Hex;
		createdAt: Date;
		completedFieldIds: string[];
		completionsRoot: Hex | null;
		leafSchemaVersion: number | null;
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
		lastViewedAt: Date;
		viewCount: number;
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
		amendTxHash: Hex;
		createdAt: Date;
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
			placementManifestJson: files.placementManifestJson,
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
			lastViewedAt: fileDocumentViews.lastViewedAt,
			viewCount: fileDocumentViews.viewCount,
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
	const registry = fsFileRegistryAt(fileRecord.registryAddress);

	let onchainRegistration: ComplianceLoadContext["onchainRegistration"] = null;
	const cidRes = await tryCatch(registry.read.cidIdentifier([pieceCid]));
	if (cidRes.data) {
		const cidId = cidRes.data as Hex;
		const regRes = await tryCatch(registry.read.fileRegistrations([cidId]));
		const reg = regRes.data as
			| {
					sender: Address;
					signersCommitment: Hex;
					viewersCommitment: Hex;
					placementCommitment: Hex;
					senderEmailCommitment: Hex;
					senderPrivySubjectCommitment: Hex;
					requiredSignersCount: number | bigint;
					requiredSignaturesCount: number | bigint;
					optionalSignersCount: number | bigint;
					optionalSignaturesCount: number | bigint;
					signersCount: number | bigint;
					signaturesCount: number | bigint;
					quorumN: number | bigint;
					routingMode: number | bigint;
					timestamp: bigint;
			  }
			| undefined;
		if (reg && reg.timestamp > 0n) {
			const [allRequiredSigned, allSigned, quorumMet] = await Promise.all([
				tryCatch(registry.read.allRequiredSigned([cidId])),
				tryCatch(registry.read.allSigned([cidId])),
				tryCatch(registry.read.quorumMet([cidId])),
			]);
			let rosterSignedCount = Number(reg.signaturesCount);
			const rosterRes = await tryCatch(
				(
					registry.read as typeof registry.read & {
						rosterSignedCount: (
							args: readonly [Hex],
						) => Promise<number | bigint>;
					}
				).rosterSignedCount([cidId]),
			);
			if (!rosterRes.error && rosterRes.data != null) {
				rosterSignedCount = Number(rosterRes.data);
			}
			onchainRegistration = {
				cidIdentifier: cidId,
				sender: getAddress(reg.sender),
				signersCommitment: reg.signersCommitment as Hex,
				viewersCommitment: reg.viewersCommitment as Hex,
				placementCommitment: reg.placementCommitment as Hex,
				senderEmailCommitment: reg.senderEmailCommitment as Hex,
				senderPrivySubjectCommitment: reg.senderPrivySubjectCommitment as Hex,
				requiredSignersCount: Number(reg.requiredSignersCount),
				requiredSignaturesCount: Number(reg.requiredSignaturesCount),
				optionalSignersCount: Number(reg.optionalSignersCount),
				optionalSignaturesCount: Number(reg.optionalSignaturesCount),
				signersCount: Number(reg.signersCount),
				signaturesCount: Number(reg.signaturesCount),
				quorumN: Number(reg.quorumN),
				routingMode: Number(reg.routingMode),
				allRequiredSigned: allRequiredSigned.data ?? false,
				allSigned: allSigned.data ?? false,
				quorumMet: quorumMet.data ?? false,
				rosterSignedCount,
				timestamp: reg.timestamp.toString(),
			};
		}
	}

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
			amendTxHash: fileSignerAmendments.amendTxHash,
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
		amendTxHash: r.amendTxHash as Hex,
		createdAt: r.createdAt,
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
			placementManifestJson: fileRecord.placementManifestJson,
		},
		manifest,
		sigRows: sigRowsNormalized,
		draftByWallet,
		sigByWallet,
		ackRowsRaw,
		viewRowsRaw: viewRowsRaw.map((r) => ({
			wallet: getAddress(r.wallet),
			firstViewedAt: r.firstViewedAt,
			lastViewedAt: r.lastViewedAt,
			viewCount: r.viewCount,
			source: r.source,
		})),
		coldInviteClaimRows,
		onchainRegistration,
		executionStatus,
		exportedAtIso,
		senderNorm,
		settlementRows,
		amendmentRows,
	};
}
