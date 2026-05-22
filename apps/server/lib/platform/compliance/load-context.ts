import type { PlacementManifest } from "@filosign/shared";
import { zPlacementManifest } from "@filosign/shared";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import type db from "@/lib/platform/db";
import {
	fileAcknowledgements,
	fileSignatures,
	fileSignerDrafts,
	files,
} from "@/lib/platform/db/schema/file";
import { fileSettlementRules } from "@/lib/platform/db/schema/settlements";
import { shareApprovals } from "@/lib/platform/db/schema/sharing";
import { users } from "@/lib/platform/db/schema/user";
import { fsContracts } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import type { ParticipantRow } from "./types";

const { FSFileRegistry } = fsContracts;

export type ComplianceLoadContext = {
	pieceCid: string;
	participantRows: ParticipantRow[];
	fileRecord: {
		sender: Address;
		onchainTxHash: Hex;
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
		ack: string;
		email: string | null;
		privyDid: string | null;
	}[];
	approvalRows: {
		recipientWallet: Address;
		senderWallet: Address;
		active: boolean;
		txHash: Hex;
		createdAt: Date;
	}[];
	latestApproveByRecipient: Map<string, Hex>;
	onchainRegistration: import("@filosign/shared").ComplianceBundle["onchainRegistration"];
	executionStatus: "fully_executed" | "partially_executed";
	exportedAtIso: string;
	senderNorm: Address;
	settlementRows: {
		onChainRuleId: bigint;
		recipientWallet: Address;
		tokenAddress: Address;
		amount: string;
		releaseType: string;
		status: string;
		registerRuleTxHash: Hex;
		approveTxHash: Hex;
		payoutTxHash: Hex | null;
		executedAt: Date | null;
		lastError: string | null;
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
			ack: fileAcknowledgements.ack,
			email: users.email,
			privyDid: users.privyDid,
		})
		.from(fileAcknowledgements)
		.innerJoin(users, eq(fileAcknowledgements.wallet, users.walletAddress))
		.where(eq(fileAcknowledgements.filePieceCid, pieceCid));

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
	const participantWallets = [
		...new Set(participantRows.map((p) => getAddress(p.wallet))),
	];

	const approvalRows = await database
		.select({
			recipientWallet: shareApprovals.recipientWallet,
			senderWallet: shareApprovals.senderWallet,
			active: shareApprovals.active,
			txHash: shareApprovals.txHash,
			createdAt: shareApprovals.createdAt,
		})
		.from(shareApprovals)
		.where(
			or(
				and(
					eq(shareApprovals.senderWallet, senderNorm),
					inArray(shareApprovals.recipientWallet, participantWallets),
				),
				and(
					eq(shareApprovals.recipientWallet, senderNorm),
					inArray(shareApprovals.senderWallet, participantWallets),
				),
			),
		)
		.orderBy(desc(shareApprovals.createdAt));

	const latestApproveByRecipient = new Map<string, Hex>();
	for (const row of approvalRows) {
		if (!row.active) continue;
		const rec = getAddress(row.recipientWallet).toLowerCase();
		if (
			getAddress(row.senderWallet) === senderNorm &&
			!latestApproveByRecipient.has(rec)
		) {
			latestApproveByRecipient.set(rec, row.txHash as Hex);
		}
	}

	let onchainRegistration: ComplianceLoadContext["onchainRegistration"] = null;
	const cidRes = await tryCatch(FSFileRegistry.read.cidIdentifier([pieceCid]));
	if (cidRes.data) {
		const cidId = cidRes.data as Hex;
		const regRes = await tryCatch(
			FSFileRegistry.read.fileRegistrations([cidId]),
		);
		const reg = regRes.data as
			| {
					sender: Address;
					signersCommitment: Hex;
					viewersCommitment: Hex;
					placementCommitment: Hex;
					senderEmailCommitment: Hex;
					senderPrivySubjectCommitment: Hex;
					signersCount: number | bigint;
					signaturesCount: number | bigint;
					timestamp: bigint;
			  }
			| undefined;
		if (reg) {
			onchainRegistration = {
				cidIdentifier: cidId,
				sender: getAddress(reg.sender),
				signersCommitment: reg.signersCommitment as Hex,
				viewersCommitment: reg.viewersCommitment as Hex,
				placementCommitment: reg.placementCommitment as Hex,
				senderEmailCommitment: reg.senderEmailCommitment as Hex,
				senderPrivySubjectCommitment: reg.senderPrivySubjectCommitment as Hex,
				signersCount: Number(reg.signersCount),
				signaturesCount: Number(reg.signaturesCount),
				timestamp: reg.timestamp.toString(),
			};
		}
	}

	const settlementRowsRaw = await database
		.select({
			onChainRuleId: fileSettlementRules.onChainRuleId,
			recipientWallet: fileSettlementRules.recipientWallet,
			tokenAddress: fileSettlementRules.tokenAddress,
			amount: fileSettlementRules.amount,
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

	const settlementRows = settlementRowsRaw.map((r) => ({
		onChainRuleId: r.onChainRuleId,
		recipientWallet: getAddress(r.recipientWallet),
		tokenAddress: getAddress(r.tokenAddress),
		amount: r.amount,
		releaseType: r.releaseType,
		status: r.status,
		registerRuleTxHash: r.registerRuleTxHash as Hex,
		approveTxHash: r.approveTxHash as Hex,
		payoutTxHash: r.payoutTxHash ? (r.payoutTxHash as Hex) : null,
		executedAt: r.executedAt,
		lastError: r.lastError,
	}));

	return {
		pieceCid,
		participantRows,
		fileRecord: {
			sender: fileRecord.sender,
			onchainTxHash: fileRecord.onchainTxHash as Hex,
			createdAt: fileRecord.createdAt,
			placementCommitment: fileRecord.placementCommitment as Hex,
			placementManifestJson: fileRecord.placementManifestJson,
		},
		manifest,
		sigRows: sigRowsNormalized,
		draftByWallet,
		sigByWallet,
		ackRowsRaw,
		approvalRows: approvalRows.map((r) => ({
			recipientWallet: getAddress(r.recipientWallet),
			senderWallet: getAddress(r.senderWallet),
			active: r.active,
			txHash: r.txHash as Hex,
			createdAt: new Date(r.createdAt as string | number | Date),
		})),
		latestApproveByRecipient,
		onchainRegistration,
		executionStatus,
		exportedAtIso,
		senderNorm,
		settlementRows,
	};
}
