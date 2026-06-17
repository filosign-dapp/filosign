import type { ComplianceBundle } from "@filosign/shared";
import {
	completionsMerkleProofsV1,
	fieldIdsForRecipientEmail,
	isValidAckSignature,
	normalizePlacementRecipientEmail,
	requiredFieldIdsForRecipientEmail,
} from "@filosign/shared";
import { getAddress } from "viem";
import type { ComplianceLoadContext } from "../load-context";
import { displayNameFromUser } from "../types";

function timelineForWallet(
	ctx: ComplianceLoadContext,
	wallet: `0x${string}`,
): { acknowledgedAtIso: string | null; firstViewedAtIso: string | null } {
	const key = wallet.toLowerCase();
	const ack = ctx.ackRowsRaw.find(
		(r) =>
			getAddress(r.wallet).toLowerCase() === key && isValidAckSignature(r.ack),
	);
	const view = ctx.viewRowsRaw.find(
		(r) => getAddress(r.wallet).toLowerCase() === key,
	);
	return {
		acknowledgedAtIso: ack?.acknowledgedAt.toISOString() ?? null,
		firstViewedAtIso: view?.firstViewedAt.toISOString() ?? null,
	};
}

export function buildComplianceSigners(
	ctx: ComplianceLoadContext,
): ComplianceBundle["signers"] {
	const { pieceCid, manifest, fileRecord, draftByWallet, sigByWallet } = ctx;
	const signerParticipants = ctx.participantRows.filter(
		(p) => p.role === "signer",
	);

	return signerParticipants.map((p) => {
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
		const timeline = timelineForWallet(ctx, wallet as `0x${string}`);

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
				onchainTxHash: sig.onchainTxHash,
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
				requestIp: sig.requestIp ?? null,
				requestUserAgent: sig.requestUserAgent ?? null,
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
}

export function applyBlockTimestampsToSigners(
	signers: ComplianceBundle["signers"],
	receiptCache: Map<
		string,
		{ blockNumber: number | null; timestamp: number | null }
	>,
): void {
	for (const s of signers) {
		if (!s.signed || !s.onchainTxHash) continue;
		const meta = receiptCache.get(s.onchainTxHash.toLowerCase());
		if (meta?.timestamp != null) {
			s.blockTimestampFromTx = meta.timestamp;
		}
	}
}
