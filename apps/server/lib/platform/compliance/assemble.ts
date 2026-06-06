import type {
	ComplianceBundle,
	SettlementReleaseType,
	SettlementRuleStatus,
} from "@filosign/shared";
import { getAddress } from "viem";
import config from "@/config";
import { listPieceFieldCompletions } from "@/lib/domains/files/utils/field-completions";
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
		releaseType: pay.releaseType as SettlementReleaseType,
		status: pay.status as SettlementRuleStatus,
		registerRuleTxHash: pay.registerRuleTxHash,
		approveTxHash: pay.approveTxHash,
		payoutTxHash: pay.payoutTxHash,
		executedAtIso: pay.executedAt?.toISOString() ?? null,
		lastError: pay.lastError,
	}));
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
		offChainEvidence,
		fieldCompletions,
	};
}
