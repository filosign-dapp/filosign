import type {
	ComplianceBundle,
	SettlementReleaseType,
	SettlementRuleStatus,
} from "@filosign/shared";
import {
	completionsMerkleProofsV1,
	fieldIdsForRecipientEmail,
	hashAuthSubjectCommitment,
	hashNormalizedSignerEmail,
	isValidAckSignature,
	normalizePlacementRecipientEmail,
	requiredFieldIdsForRecipientEmail,
} from "@filosign/shared";
import type { Address, Hex } from "viem";
import { getAddress, isHex } from "viem";
import config from "@/config";
import { sha256HexOfHexBytes } from "./hash";
import type { ComplianceLoadContext } from "./load-context";
import { receiptMeta } from "./receipt-meta";
import { displayNameFromUser, roleOrder, type TxDraft } from "./types";

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
		viewRowsRaw,
		coldInviteClaimRows,
		onchainRegistration,
		executionStatus,
		exportedAtIso,
		senderNorm,
		settlementRows,
		amendmentRows,
		settlementRecipientAckRows,
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
		const privySubjectCommitment = p.authProviderId?.trim()
			? hashAuthSubjectCommitment(p.authProviderId.trim())
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

	const ackByWallet = new Map(
		ackRowsRaw
			.filter((r) => isValidAckSignature(r.ack))
			.map((r) => [getAddress(r.wallet).toLowerCase(), r]),
	);
	const viewByWallet = new Map(
		viewRowsRaw.map((r) => [getAddress(r.wallet).toLowerCase(), r]),
	);

	const timelineForWallet = (wallet: Address) => {
		const key = wallet.toLowerCase();
		const ack = ackByWallet.get(key);
		const view = viewByWallet.get(key);
		return {
			acknowledgedAtIso: ack?.acknowledgedAt.toISOString() ?? null,
			firstViewedAtIso: view?.firstViewedAt.toISOString() ?? null,
		};
	};

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
		const timeline = timelineForWallet(wallet);

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
				completedFieldIds,
				completionsRoot: sig.completionsRoot,
				leafSchemaVersion: sig.leafSchemaVersion,
				merkleProofs,
				draftCompletedFieldIds: [] as string[],
				acknowledgedAtIso: timeline.acknowledgedAtIso,
				firstViewedAtIso: timeline.firstViewedAtIso,
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
			completedFieldIds: [] as string[],
			completionsRoot: null,
			leafSchemaVersion: null,
			merkleProofs: [] as ComplianceBundle["signers"][number]["merkleProofs"],
			draftCompletedFieldIds: draftIds.filter((id) =>
				assignedFieldIds.includes(id),
			),
			acknowledgedAtIso: timeline.acknowledgedAtIso,
			firstViewedAtIso: timeline.firstViewedAtIso,
		};
	});

	const regAddr = getAddress(fileRecord.registryAddress);
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

	for (const amend of amendmentRows) {
		txDrafts.push({
			kind: "signer_amended",
			txHash: amend.amendTxHash,
			contractAddress: regAddr,
			summary: `amendSigner — ${amend.oldCommitment} → ${amend.newCommitment}`,
			relatedAddresses: [senderNorm],
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
		if (!isValidAckSignature(row.ack)) continue;
		const w = getAddress(row.wallet);
		const emailRaw = row.email?.trim();
		if (!emailRaw) continue;
		const email = normalizePlacementRecipientEmail(emailRaw);
		const emailCommitment = hashNormalizedSignerEmail(email);
		const privySubjectCommitment = row.authProviderId?.trim()
			? hashAuthSubjectCommitment(row.authProviderId.trim())
			: null;
		const ackHex = row.ack as Hex;
		const ackSha256 = isHex(ackHex) ? sha256HexOfHexBytes(ackHex) : null;
		acknowledgements.push({
			wallet: w,
			createdAtIso: row.ackCreatedAt.toISOString(),
			acknowledgedAtIso: row.acknowledgedAt.toISOString(),
			intentVersion: row.intentVersion,
			emailCommitment,
			privySubjectCommitment,
			ackSha256,
		});
	}

	const documentViews: ComplianceBundle["offChainEvidence"]["documentViews"] =
		viewRowsRaw.map((row) => ({
			wallet: getAddress(row.wallet),
			firstViewedAtIso: row.firstViewedAt.toISOString(),
			lastViewedAtIso: row.lastViewedAt.toISOString(),
			viewCount: row.viewCount,
			source: row.source,
		}));

	const coldInviteClaims: ComplianceBundle["offChainEvidence"]["coldInviteClaims"] =
		coldInviteClaimRows.map((row) => ({
			email: row.email,
			wallet: row.wallet,
			claimedAtIso: row.claimedAt.toISOString(),
			isSigner: row.isSigner,
		}));

	const payoutRecipientAcknowledgements: ComplianceBundle["offChainEvidence"]["payoutRecipientAcknowledgements"] =
		settlementRecipientAckRows.map((row) => ({
			signerWallet: getAddress(row.signerWallet),
			termsVersion: row.termsVersion,
			acknowledgedAtIso: row.acknowledgedAt.toISOString(),
		}));

	const settlements: ComplianceBundle["settlements"] = settlementRows.map(
		(pay) => ({
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
		}),
	);

	return {
		version: 7,
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
		settlements,
		offChainEvidence: {
			acknowledgements,
			documentViews,
			coldInviteClaims,
			payoutRecipientAcknowledgements,
		},
	};
}
