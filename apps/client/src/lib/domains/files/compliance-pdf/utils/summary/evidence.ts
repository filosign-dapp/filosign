import type { ComplianceBundle } from "@filosign/shared";
import type { CompliancePdfLine } from "../../compliance-pdf-types";

export function buildAckLines(bundle: ComplianceBundle): CompliancePdfLine[] {
	const ackLines: CompliancePdfLine[] = [];
	if (bundle.offChainEvidence.acknowledgements.length > 0) {
		ackLines.push(
			{
				text: "These entries were signed with EIP-712 off-chain; they are not implied by a transaction hash alone. Verify signatures against the wallets and commitments shown.",
				textStyle: "lead",
			},
			{ text: "" },
			{
				text: "Off-chain acknowledgements (EIP-712 validated; no chain tx):",
				textStyle: "listHeading",
			},
			{ text: "" },
		);
		for (let i = 0; i < bundle.offChainEvidence.acknowledgements.length; i++) {
			const a = bundle.offChainEvidence.acknowledgements[i];
			ackLines.push({
				text: `${i + 1}. Wallet ${a.wallet} acknowledged at ${a.acknowledgedAtIso}`,
			});
			ackLines.push({ text: `   intentVersion: ${a.intentVersion}` });
			ackLines.push({ text: `   emailCommitment: ${a.emailCommitment}` });
			if (a.authSubjectCommitment) {
				ackLines.push({
					text: `   authSubjectCommitment: ${a.authSubjectCommitment}`,
				});
			}
			if (a.ackSha256) {
				ackLines.push({ text: `   ackSha256: ${a.ackSha256}` });
			}
			if (i < bundle.offChainEvidence.acknowledgements.length - 1) {
				ackLines.push({ text: "" });
			}
		}
	}
	return ackLines;
}

export function buildPayoutAckLines(
	bundle: ComplianceBundle,
): CompliancePdfLine[] {
	const payoutAckLines: CompliancePdfLine[] = [];
	if (bundle.offChainEvidence.payoutRecipientAcknowledgements.length > 0) {
		payoutAckLines.push(
			{
				text: "Signer disclosures logged when an optional USDC payout was attached. Filosign does not guarantee payment.",
				textStyle: "lead",
			},
			{ text: "" },
		);
		for (
			let i = 0;
			i < bundle.offChainEvidence.payoutRecipientAcknowledgements.length;
			i++
		) {
			const ack = bundle.offChainEvidence.payoutRecipientAcknowledgements[i];
			payoutAckLines.push({
				text: `${i + 1}. ${ack.signerWallet} - version ${ack.termsVersion} - ${ack.acknowledgedAtIso}`,
			});
			if (
				i <
				bundle.offChainEvidence.payoutRecipientAcknowledgements.length - 1
			) {
				payoutAckLines.push({ text: "" });
			}
		}
	}
	return payoutAckLines;
}

export function buildViewLines(bundle: ComplianceBundle): CompliancePdfLine[] {
	const viewLines: CompliancePdfLine[] = [];
	if (bundle.offChainEvidence.documentViews.length > 0) {
		viewLines.push(
			{
				text: "These are recorded document open events. They show view activity separately from signatures or acknowledgements.",
				textStyle: "lead",
			},
			{ text: "" },
		);
		for (let i = 0; i < bundle.offChainEvidence.documentViews.length; i++) {
			const v = bundle.offChainEvidence.documentViews[i];
			viewLines.push({
				text: `${i + 1}. Wallet ${v.wallet} first opened ${v.firstViewedAtIso} (${v.source})`,
			});
			if (i < bundle.offChainEvidence.documentViews.length - 1) {
				viewLines.push({ text: "" });
			}
		}
	}
	return viewLines;
}
