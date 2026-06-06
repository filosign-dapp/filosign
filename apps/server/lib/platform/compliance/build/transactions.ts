import type { Hex } from "viem";
import { getAddress } from "viem";
import type { ComplianceLoadContext } from "../load-context";
import { receiptMeta } from "../receipt-meta";
import type { TxDraft } from "../types";

export function buildComplianceTxDrafts(ctx: ComplianceLoadContext): TxDraft[] {
	const { fileRecord, sigRows, amendmentRows, settlementRows, senderNorm } =
		ctx;
	const regAddr = getAddress(fileRecord.registryAddress);
	const txDrafts: TxDraft[] = [];

	txDrafts.push({
		kind: "file_registered",
		txHash: fileRecord.onchainTxHash,
		contractAddress: regAddr,
		summary:
			"registerEnvelope — file placement and sender commitments recorded on-chain",
		relatedAddresses: [senderNorm],
	});

	for (const s of sigRows) {
		const w = getAddress(s.signer);
		txDrafts.push({
			kind: "file_signed",
			txHash: s.onchainTxHash,
			contractAddress: regAddr,
			summary: `registerEnvelopeSignature — signer ${w}`,
			relatedAddresses: [senderNorm, w],
		});
	}

	for (const amend of amendmentRows) {
		txDrafts.push({
			kind: "signer_amended",
			txHash: amend.proposeTxHash,
			contractAddress: regAddr,
			summary: `proposeSignerReplacement (${amend.status}) — ${amend.oldCommitment} → ${amend.newCommitment}`,
			relatedAddresses: [senderNorm],
		});
		if (amend.executeTxHash) {
			txDrafts.push({
				kind: "signer_amended",
				txHash: amend.executeTxHash,
				contractAddress: regAddr,
				summary: `executeSignerReplacement — ${amend.oldCommitment} → ${amend.newCommitment}`,
				relatedAddresses: [senderNorm],
			});
		}
		if (amend.cancelTxHash) {
			txDrafts.push({
				kind: "signer_amended",
				txHash: amend.cancelTxHash,
				contractAddress: regAddr,
				summary: `cancelSignerReplacement — ${amend.oldCommitment} → ${amend.newCommitment}`,
				relatedAddresses: [senderNorm],
			});
		}
	}

	if (fileRecord.revokeOnchainTxHash) {
		txDrafts.push({
			kind: "envelope_revoked_before_complete",
			txHash: fileRecord.revokeOnchainTxHash,
			contractAddress: regAddr,
			summary:
				"recallEnvelope — envelope voided on-chain before completion (partial signatures may remain)",
			relatedAddresses: [
				senderNorm,
				...(fileRecord.revokedBy ? [getAddress(fileRecord.revokedBy)] : []),
			],
		});
	}

	for (const pay of settlementRows) {
		if (!pay.payoutTxHash) continue;
		const payValidatorAddr = getAddress(pay.validatorAddress);
		const recipients = [
			...new Set(
				pay.legs.map((leg) => getAddress(leg.recipientWallet).toLowerCase()),
			),
		].map((addr) => getAddress(addr));
		const recipientSummary = recipients.join(", ");
		txDrafts.push({
			kind: "payout_executed",
			txHash: pay.payoutTxHash,
			contractAddress: payValidatorAddr,
			summary: `executePayout — rule ${pay.onChainRuleId.toString()} to ${recipientSummary}`,
			relatedAddresses: [senderNorm, ...recipients],
		});
	}

	return txDrafts;
}

export async function buildComplianceReceiptCache(
	txDrafts: TxDraft[],
): Promise<Map<string, Awaited<ReturnType<typeof receiptMeta>>>> {
	const uniqueHashes = [
		...new Set(txDrafts.map((t) => t.txHash.toLowerCase())),
	].map((h) => h as Hex);
	const receiptEntries = await Promise.all(
		uniqueHashes.map(async (h) => {
			const meta = await receiptMeta(h);
			return [h.toLowerCase(), meta] as const;
		}),
	);
	return new Map(receiptEntries);
}
