import type { ComplianceBundle } from "@filosign/shared";
import type { CompliancePdfLine } from "../../compliance-pdf-types";

export function buildOnchainLines(
	bundle: ComplianceBundle,
): CompliancePdfLine[] {
	const onchainLines: CompliancePdfLine[] = [];
	if (bundle.onchainRegistration) {
		const o = bundle.onchainRegistration;
		onchainLines.push(
			{
				text: "These fields were read from FSEnvelopeRegistry.envelopeRegistrations for this content id at export time. Compare them to an archive node, indexer, or explorer contract view from the same block height when you need a strict chain match.",
				textStyle: "lead",
			},
			{ text: "" },
			{
				text: "Snapshot of FSEnvelopeRegistry.envelopeRegistrations(cid) at export time:",
				textStyle: "listHeading",
			},
			{ text: "" },
			{ text: `cidIdentifier: ${o.cidIdentifier}` },
			{ text: `sender: ${o.sender}` },
			{ text: `placementCommitment: ${o.placementCommitment}` },
			{ text: `signersCommitment: ${o.signersCommitment}` },
			{ text: `viewersCommitment: ${o.viewersCommitment}` },
			{ text: `senderEmailCommitment: ${o.senderEmailCommitment}` },
			{
				text: `senderAuthSubjectCommitment: ${o.senderAuthSubjectCommitment}`,
			},
			{
				text: `requiredSignersCount: ${o.requiredSignersCount} / requiredSignaturesCount: ${o.requiredSignaturesCount} / signaturesCount: ${o.signaturesCount}`,
			},
			{ text: `registration timestamp (uint256): ${o.timestamp}` },
		);
	} else {
		onchainLines.push({
			text: "On-chain registration snapshot was unavailable (RPC); verify via explorer using registration tx and piece CID.",
			textStyle: "emphasis",
		});
	}
	return onchainLines;
}
