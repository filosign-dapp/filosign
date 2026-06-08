import type {
	ComplianceBundle,
	SettlementReleaseType,
	SettlementRuleStatus,
} from "@filosign/shared";
import { getAddress } from "viem";
import config from "@/config";
import { listPieceFieldCompletions } from "@/lib/domains/files/utils/field-completions";
import { fsAttachmentReleaseAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { buildComplianceOffChainEvidence } from "./build/off-chain-evidence";
import { buildComplianceParties } from "./build/parties";
import {
	applyBlockTimestampsToSigners,
	buildComplianceSigners,
} from "./build/signers";
import {
	buildComplianceReceiptCache,
	buildComplianceTxDrafts,
} from "./build/transactions";
import type { ComplianceLoadContext } from "./load-context";

function buildComplianceSettlements(
	ctx: ComplianceLoadContext,
): ComplianceBundle["settlements"] {
	return ctx.settlementRows.map((pay) => ({
		onChainRuleId: pay.onChainRuleId.toString(),
		legs: pay.legs.map((leg) => ({
			recipientWallet: getAddress(leg.recipientWallet),
			amount: leg.amount,
		})),
		tokenAddress: getAddress(pay.tokenAddress),
		validatorAddress: getAddress(pay.validatorAddress),
		releaseType: pay.releaseType as SettlementReleaseType,
		status: pay.status as SettlementRuleStatus,
		registerRuleTxHash: pay.registerRuleTxHash,
		approveTxHash: pay.approveTxHash,
		payoutTxHash: pay.payoutTxHash,
		executedAtIso: pay.executedAt?.toISOString() ?? null,
		lastError: pay.lastError,
	}));
}

async function buildComplianceAttachments(
	ctx: ComplianceLoadContext,
): Promise<ComplianceBundle["attachments"]> {
	const attachments: ComplianceBundle["attachments"] = [];
	for (const row of ctx.attachmentRows) {
		let unlocked = row.releaseMode === "review";
		let cancelled = false;

		if (row.releaseMode === "conditional") {
			if (row.onChainRuleId != null && row.releaseContractAddress) {
				const release = fsAttachmentReleaseAt(row.releaseContractAddress);
				if (release) {
					const ruleRes = await tryCatch(
						release.read.rules([BigInt(row.onChainRuleId)]),
					);
					const released = !ruleRes.error && ruleRes.data[8];
					cancelled = !ruleRes.error && ruleRes.data[9];
					unlocked = Boolean(released) && !cancelled;
				}
			}
		}

		attachments.push({
			packetId: row.packetId,
			packetCid: row.packetCid,
			label: row.label,
			releaseMode: row.releaseMode,
			releaseType: row.releaseType as SettlementReleaseType | null,
			releaseParams: row.releaseParams as
				| import("@filosign/shared").SettlementReleaseParams
				| null,
			recipientsCommitment: row.recipientsCommitment,
			onChainRuleId: row.onChainRuleId,
			releaseContractAddress: row.releaseContractAddress,
			registerRuleTxHash: row.registerRuleTxHash,
			packetContentHash: row.packetContentHash,
			releaseTxHash: row.releaseTxHash,
			recipientCount: row.recipientCount,
			unlocked,
			cancelled,
		});
	}
	return attachments;
}

export async function assembleComplianceBundle(
	ctx: ComplianceLoadContext,
): Promise<ComplianceBundle> {
	const { pieceCid, fileRecord, exportedAtIso, senderNorm, executionStatus } =
		ctx;

	const parties = buildComplianceParties(ctx);
	const signers = buildComplianceSigners(ctx);
	const txDrafts = buildComplianceTxDrafts(ctx);
	const receiptCache = await buildComplianceReceiptCache(txDrafts);
	const chainId = config.runtimeChain.id;

	const transactions: ComplianceBundle["transactions"] = txDrafts
		.map((d) => {
			const meta = receiptCache.get(d.txHash.toLowerCase()) ?? {
				blockNumber: null,
				timestamp: null,
			};
			return {
				kind: d.kind,
				txHash: d.txHash,
				chainId,
				contractAddress: d.contractAddress,
				summary: d.summary,
				relatedAddresses: d.relatedAddresses,
				blockNumber: meta.blockNumber,
				timestamp: meta.timestamp,
				fetchedAtIso: exportedAtIso,
			};
		})
		.sort((a, b) => {
			if (a.blockNumber != null && b.blockNumber != null) {
				if (a.blockNumber !== b.blockNumber)
					return a.blockNumber - b.blockNumber;
			} else if (a.blockNumber != null) return -1;
			else if (b.blockNumber != null) return 1;
			return a.txHash.localeCompare(b.txHash);
		});

	applyBlockTimestampsToSigners(
		signers,
		receiptCache as Map<
			string,
			{ blockNumber: number | null; timestamp: number | null }
		>,
	);

	const settlements = buildComplianceSettlements(ctx);
	const attachments = await buildComplianceAttachments(ctx);
	const offChainEvidence = buildComplianceOffChainEvidence(ctx);
	const fieldCompletions = await listPieceFieldCompletions(pieceCid);

	return {
		version: 1,
		pieceCid,
		chainId,
		exportedAtIso,
		executionStatus,
		placementCommitment: fileRecord.placementCommitment,
		placementManifest: ctx.manifest,
		registration: {
			sender: senderNorm,
			registrationTxHash: fileRecord.onchainTxHash,
			createdAtIso: fileRecord.createdAt.toISOString(),
			registerDocumentSha256: fileRecord.documentSha256,
		},
		parties,
		onchainRegistration: ctx.onchainRegistration,
		transactions,
		signers,
		settlements,
		attachments,
		offChainEvidence,
		fieldCompletions,
	};
}
