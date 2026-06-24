import type { SettlementRuleRow } from "@filosign/react/files";
import {
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import type { Hex } from "viem";
import { hasPaidSettlementLegs } from "@/src/lib/domains/settlements/utils/paid-legs";
import {
	type EnvelopeProgressLike,
	isEnvelopeVoided,
} from "@/src/routes/dashboard/document/sign/-lib/utils/envelope-progress-display";

export { hasPaidSettlementLegs };

export type SignerRosterRow = {
	wallet: string;
	name?: string | null;
	email?: string | null;
	invitePending?: boolean;
};

export type SignerSignatureRow = {
	signer: string;
};

export function envelopeOpenForGovernance(args: {
	isSender: boolean;
	envelopeProgress?: EnvelopeProgressLike | null;
	pendingSignerReplacement?: boolean | null;
}): boolean {
	if (!args.isSender) return false;
	if (isEnvelopeVoided(args.envelopeProgress)) return false;
	if (args.envelopeProgress?.completedAt) return false;
	if (args.pendingSignerReplacement) return false;
	return true;
}

export function senderToolsClosedCopy(args: {
	envelopeProgress?: EnvelopeProgressLike | null;
	pendingSignerReplacement?: boolean | null;
}): string | null {
	if (args.pendingSignerReplacement) {
		return "Finish or cancel the roster change before adding payouts, file packets, or changing signers.";
	}
	if (isEnvelopeVoided(args.envelopeProgress)) {
		return "This envelope was voided. Signer, payout, and file packet rules can no longer be changed.";
	}
	if (args.envelopeProgress?.completedAt) {
		return "This envelope is complete. Signer, payout, and file packet rules can no longer be changed.";
	}
	return null;
}

export function unsignedSignerOptionsFromFile(
	signers: readonly SignerRosterRow[],
	signatures: readonly SignerSignatureRow[] | undefined,
): Array<{
	email: string;
	label: string;
	commitment: Hex;
	wallet: string;
}> {
	const signedWallets = new Set(
		(signatures ?? []).map((s) => s.signer.toLowerCase()),
	);

	return signers.flatMap((s) => {
		const trimmed = s.email?.trim();
		if (!trimmed || s.invitePending) return [];
		if (signedWallets.has(s.wallet.toLowerCase())) return [];
		const email = normalizePlacementRecipientEmail(trimmed);
		return [
			{
				email,
				label: s.name?.trim() || email,
				commitment: hashNormalizedSignerEmail(email),
				wallet: s.wallet,
			},
		];
	});
}

export function resolveCommitmentEmail(
	commitment: Hex,
	signers: readonly SignerRosterRow[],
): string | null {
	for (const signer of signers) {
		if (!signer.email?.trim()) continue;
		const email = normalizePlacementRecipientEmail(signer.email.trim());
		if (hashNormalizedSignerEmail(email) === commitment) {
			return email;
		}
	}
	return null;
}

export function hasSpecificSignerPayout(
	rules: readonly SettlementRuleRow[],
): boolean {
	return rules.some((rule) => rule.releaseType === "specific_signer");
}
