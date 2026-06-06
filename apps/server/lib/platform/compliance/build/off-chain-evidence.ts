import type { ComplianceBundle } from "@filosign/shared";
import {
	hashAuthSubjectCommitment,
	hashNormalizedSignerEmail,
	isValidAckSignature,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import type { Hex } from "viem";
import { getAddress, isHex } from "viem";
import { sha256HexOfHexBytes } from "../hash";
import type { ComplianceLoadContext } from "../load-context";

export function buildComplianceOffChainEvidence(
	ctx: ComplianceLoadContext,
): ComplianceBundle["offChainEvidence"] {
	const acknowledgements: ComplianceBundle["offChainEvidence"]["acknowledgements"] =
		[];
	for (const row of ctx.ackRowsRaw) {
		if (!isValidAckSignature(row.ack)) continue;
		const w = getAddress(row.wallet);
		const emailRaw = row.email?.trim();
		if (!emailRaw) continue;
		const email = normalizePlacementRecipientEmail(emailRaw);
		const emailCommitment = hashNormalizedSignerEmail(email);
		const authSubjectCommitment = row.authProviderId?.trim()
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
			authSubjectCommitment,
			ackSha256,
		});
	}

	const documentViews: ComplianceBundle["offChainEvidence"]["documentViews"] =
		ctx.viewRowsRaw.map((row) => ({
			wallet: getAddress(row.wallet),
			firstViewedAtIso: row.firstViewedAt.toISOString(),
			source: row.source,
		}));

	const coldInviteClaims: ComplianceBundle["offChainEvidence"]["coldInviteClaims"] =
		ctx.coldInviteClaimRows.map((row) => ({
			email: row.email,
			wallet: row.wallet,
			claimedAtIso: row.claimedAt.toISOString(),
			isSigner: row.isSigner,
		}));

	const payoutRecipientAcknowledgements: ComplianceBundle["offChainEvidence"]["payoutRecipientAcknowledgements"] =
		ctx.settlementRecipientAckRows.map((row) => ({
			signerWallet: getAddress(row.signerWallet),
			termsVersion: row.termsVersion,
			acknowledgedAtIso: row.acknowledgedAt.toISOString(),
		}));

	return {
		acknowledgements,
		documentViews,
		coldInviteClaims,
		payoutRecipientAcknowledgements,
	};
}
