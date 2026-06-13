import type { ComplianceBundle } from "@filosign/shared";
import type { CompliancePdfLine } from "../../compliance-pdf-types";

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

function signerLabel(s: ComplianceBundle["signers"][number]): string {
	return s.displayName?.trim() || s.email?.trim() || s.wallet;
}

export function buildSigningTimelineLines(
	bundle: ComplianceBundle,
): CompliancePdfLine[] {
	type TimelineEvent = { at: string; text: string };
	const events: TimelineEvent[] = [];

	for (const signer of bundle.signers) {
		const who = signerLabel(signer);
		if (signer.acknowledgedAtIso) {
			events.push({
				at: signer.acknowledgedAtIso,
				text: `${who} acknowledged the envelope`,
			});
		}
		if (signer.firstViewedAtIso) {
			events.push({
				at: signer.firstViewedAtIso,
				text: `${who} first viewed the document`,
			});
		}
		if (signer.signed && signer.signedAtIso) {
			events.push({
				at: signer.signedAtIso,
				text: `${who} signed`,
			});
		}
	}

	if (events.length === 0) {
		return [
			{
				text: "No timeline events were recorded in this export.",
				textStyle: "emphasis",
			},
		];
	}

	events.sort((a, b) => a.at.localeCompare(b.at));

	const lines: CompliancePdfLine[] = [
		{
			text: "Key moments in this workflow, in chronological order.",
			textStyle: "lead",
		},
		{ text: "" },
	];
	for (let i = 0; i < events.length; i++) {
		const event = events[i];
		lines.push({ text: `${i + 1}. ${event.at} - ${event.text}` });
	}
	return lines;
}
