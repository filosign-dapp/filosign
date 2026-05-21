import type {
	ComplianceBundle,
	PaymentReleaseType,
	PaymentRuleStatus,
} from "@filosign/shared";
import {
	completionsMerkleProofsV1,
	FILE_ACK_COLD_CLAIM_SENTINEL_V1,
	fieldIdsForRecipientEmail,
	hashNormalizedSignerEmail,
	hashPrivySubjectCommitment,
	normalizePlacementRecipientEmail,
	requiredFieldIdsForRecipientEmail,
} from "@filosign/shared";
import type { Hex } from "viem";
import { getAddress, isHex } from "viem";
import config from "@/config";
import { fsContracts } from "@/lib/platform/evm";
import { sha256HexOfHexBytes } from "./hash";
import type { ComplianceLoadContext } from "./load-context";
import { receiptMeta } from "./receipt-meta";
import { displayNameFromUser, roleOrder, type TxDraft } from "./types";

const { FSFileRegistry, FSManager, FSPaymentValidator } = fsContracts;

export async function assembleComplianceBundle(
	ctx: ComplianceLoadContext,
): Promise<ComplianceBundle> {
	const {
		pieceCid,
		participantRows,
		fileRecord,
		manifest,
		sigRows,
		draftByWallet,
		sigByWallet,
		ackRowsRaw,
		approvalRows,
		latestApproveByRecipient,
		onchainRegistration,
		executionStatus,
		exportedAtIso,
		senderNorm,
		paymentRows,
	} = ctx;

	const signerParticipants = participantRows.filter((p) => p.role === "signer");

	const sortedParticipants = [...participantRows].sort((a, b) => {
		const ro = roleOrder(a.role) - roleOrder(b.role);
		if (ro !== 0) return ro;
		return getAddress(a.wallet).localeCompare(getAddress(b.wallet));
	});

	const parties: ComplianceBundle["parties"] = sortedParticipants.map((p) => {
		const wallet = getAddress(p.wallet);
		const emailRaw = p.email?.trim();
		if (!emailRaw) {
			throw new Error(
				`Participant ${wallet} missing email for compliance export`,
			);
		}
		const email = normalizePlacementRecipientEmail(emailRaw);
		const emailCommitment = hashNormalizedSignerEmail(email);
		const privySubjectCommitment = p.privyDid?.trim()
			? hashPrivySubjectCommitment(p.privyDid.trim())
			: null;
		return {
			role: p.role,
			wallet,
			email,
			displayName: displayNameFromUser(p),
			emailCommitment,
			privySubjectCommitment,
		};
	});

	const signers: ComplianceBundle["signers"] = signerParticipants.map((p) => {
		const wallet = getAddress(p.wallet);
		const walletKey = wallet.toLowerCase();
		const displayName = displayNameFromUser(p);

		const emailNorm = p.email?.trim()
			? normalizePlacementRecipientEmail(p.email)
			: "";
		const assigned = emailNorm
			? fieldIdsForRecipientEmail(manifest, emailNorm)
			: [];
		const assignedFieldIds = assigned.map((f) => f.id);
		const reqIds = emailNorm
			? requiredFieldIdsForRecipientEmail(manifest, emailNorm)
			: [];
		const reqSet = new Set(reqIds);
		const optionalFieldIds = assignedFieldIds.filter((id) => !reqSet.has(id));

		const sig = sigByWallet.get(walletKey);
		const draftIds = draftByWallet.get(walletKey) ?? [];
		const approveSenderTxHash = latestApproveByRecipient.get(walletKey) ?? null;

		if (sig) {
			const completedFieldIds = sig.completedFieldIds;
			const merkleProofs = completionsMerkleProofsV1({
				fieldIds: completedFieldIds,
				placementCommitment: fileRecord.placementCommitment,
				pieceCid,
				signer: wallet,
			}).map((pr) => ({
				fieldId: pr.fieldId,
				leafHash: pr.leafHash,
				leafIndex: pr.leafIndex,
				siblings: pr.siblings,
			}));

			const signedAtIso = sig.createdAt.toISOString();
			return {
				wallet,
				displayName,
				email: p.email,
				signed: true,
				assignedFieldIds,
				requiredFieldIds: reqIds,
				optionalFieldIds,
				onchainTxHash: sig.onchainTxHash as `0x${string}`,
				signedAtIso,
				messageTimestampIso: signedAtIso,
				blockTimestampFromTx: null as number | null,
				approveSenderTxHash,
				completedFieldIds,
				completionsRoot: sig.completionsRoot,
				leafSchemaVersion: sig.leafSchemaVersion,
				merkleProofs,
				draftCompletedFieldIds: [] as string[],
			};
		}

		return {
			wallet,
			displayName,
			email: p.email,
			signed: false,
			assignedFieldIds,
			requiredFieldIds: reqIds,
			optionalFieldIds,
			onchainTxHash: null,
			signedAtIso: null,
			messageTimestampIso: null,
			blockTimestampFromTx: null,
			approveSenderTxHash,
			completedFieldIds: [] as string[],
			completionsRoot: null,
			leafSchemaVersion: null,
			merkleProofs: [] as ComplianceBundle["signers"][number]["merkleProofs"],
			draftCompletedFieldIds: draftIds.filter((id) =>
				assignedFieldIds.includes(id),
			),
		};
	});

	const regAddr = getAddress(FSFileRegistry.address);
	const mgrAddr = getAddress(FSManager.address);
	const chainId = config.runtimeChain.id;
	const fetchedAtIso = exportedAtIso;

	const txDrafts: TxDraft[] = [];
	txDrafts.push({
		kind: "file_registered",
		txHash: fileRecord.onchainTxHash,
		contractAddress: regAddr,
		summary:
			"registerFile — file placement and sender commitments recorded on-chain",
		relatedAddresses: [senderNorm],
	});

	for (const s of sigRows) {
		const w = getAddress(s.signer);
		txDrafts.push({
			kind: "file_signed",
			txHash: s.onchainTxHash,
			contractAddress: regAddr,
			summary: `registerFileSignature — signer ${w}`,
			relatedAddresses: [senderNorm, w],
		});
	}

	const validatorAddr = FSPaymentValidator?.address
		? getAddress(FSPaymentValidator.address)
		: null;

	for (const pay of paymentRows) {
		if (!pay.payoutTxHash || !validatorAddr) continue;
		txDrafts.push({
			kind: "payout_executed",
			txHash: pay.payoutTxHash,
			contractAddress: validatorAddr,
			summary: `executePayout — rule ${pay.onChainRuleId.toString()} to ${getAddress(pay.recipientWallet)}`,
			relatedAddresses: [senderNorm, getAddress(pay.recipientWallet)],
		});
	}

	const seenApprovalTx = new Set<string>();
	for (const row of approvalRows) {
		const h = row.txHash.toLowerCase();
		if (seenApprovalTx.has(h)) continue;
		seenApprovalTx.add(h);
		txDrafts.push({
			kind: row.active ? "sender_approved" : "sender_revoked",
			txHash: row.txHash,
			contractAddress: mgrAddr,
			summary: row.active
				? `approveSender — recipient ${getAddress(row.recipientWallet)} approved sender ${getAddress(row.senderWallet)}`
				: `sender relationship update (revoked) — tx ${row.txHash}`,
			relatedAddresses: [
				getAddress(row.recipientWallet),
				getAddress(row.senderWallet),
			],
		});
	}

	const uniqueHashes = [
		...new Set(txDrafts.map((t) => t.txHash.toLowerCase())),
	].map((h) => h as Hex);
	const receiptCache = new Map<
		string,
		Awaited<ReturnType<typeof receiptMeta>>
	>();
	for (const h of uniqueHashes) {
		receiptCache.set(h.toLowerCase(), await receiptMeta(h));
	}

	const transactions: ComplianceBundle["transactions"] = txDrafts.map((d) => {
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
			fetchedAtIso,
		};
	});

	transactions.sort((a, b) => {
		if (a.blockNumber != null && b.blockNumber != null) {
			if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
		} else if (a.blockNumber != null) return -1;
		else if (b.blockNumber != null) return 1;
		return a.txHash.localeCompare(b.txHash);
	});

	for (const s of signers) {
		if (!s.signed || !s.onchainTxHash) continue;
		const meta = receiptCache.get(s.onchainTxHash.toLowerCase());
		if (meta?.timestamp != null) {
			s.blockTimestampFromTx = meta.timestamp;
		}
	}

	const acknowledgements: ComplianceBundle["offChainEvidence"]["acknowledgements"] =
		[];
	for (const row of ackRowsRaw) {
		if (row.ack === FILE_ACK_COLD_CLAIM_SENTINEL_V1) continue;
		const w = getAddress(row.wallet);
		const emailRaw = row.email?.trim();
		if (!emailRaw) continue;
		const email = normalizePlacementRecipientEmail(emailRaw);
		const emailCommitment = hashNormalizedSignerEmail(email);
		const privySubjectCommitment = row.privyDid?.trim()
			? hashPrivySubjectCommitment(row.privyDid.trim())
			: null;
		const ackHex = row.ack as Hex;
		const ackSha256 = isHex(ackHex) ? sha256HexOfHexBytes(ackHex) : null;
		acknowledgements.push({
			wallet: w,
			createdAtIso: row.ackCreatedAt.toISOString(),
			emailCommitment,
			privySubjectCommitment,
			ackSha256,
		});
	}

	const payments: ComplianceBundle["payments"] = paymentRows.map((pay) => ({
		onChainRuleId: pay.onChainRuleId.toString(),
		recipientWallet: getAddress(pay.recipientWallet),
		tokenAddress: getAddress(pay.tokenAddress),
		amount: pay.amount,
		releaseType: pay.releaseType as PaymentReleaseType,
		status: pay.status as PaymentRuleStatus,
		registerRuleTxHash: pay.registerRuleTxHash,
		approveTxHash: pay.approveTxHash,
		payoutTxHash: pay.payoutTxHash,
		executedAtIso: pay.executedAt?.toISOString() ?? null,
		lastError: pay.lastError,
	}));

	return {
		version: 3,
		pieceCid,
		chainId,
		exportedAtIso,
		executionStatus,
		placementCommitment: fileRecord.placementCommitment,
		placementManifest: manifest,
		registration: {
			sender: senderNorm,
			registrationTxHash: fileRecord.onchainTxHash,
			createdAtIso: fileRecord.createdAt.toISOString(),
		},
		parties,
		onchainRegistration,
		transactions,
		signers,
		payments,
		offChainEvidence: { acknowledgements },
	};
}
