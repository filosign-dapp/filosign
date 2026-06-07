import type { ComplianceBundle } from "@filosign/shared";
import type {
	CompliancePdfBundleOptions,
	CompliancePdfLine,
	CompliancePdfSummary,
} from "../../compliance-pdf-types";
import {
	buildAboutThisRecordLines,
	buildIndependentVerificationLines,
	buildTimestampExplainerLines,
} from "../copy";
import { signersByNormalizedRecipientEmail } from "../placement";
import { buildPayoutAckLines, buildSigningTimelineLines } from "./evidence";
import {
	buildDocumentMetaLines,
	buildExecPlain,
	buildSummaryFields,
} from "./metadata";
import { buildPlacementRefLines } from "./placement-ref";
import { buildSettlementLines } from "./settlements";
import { buildSignerMatrixLines } from "./signers";

function buildPartiesLines(bundle: ComplianceBundle): CompliancePdfLine[] {
	const partiesLines: CompliancePdfLine[] = [
		{
			text: "These are the people and wallets connected to this workflow. Use this section to confirm the sender, signers, and viewers that Filosign recorded for the document.",
			textStyle: "lead",
		},
		{ text: "" },
		{
			text: "Participants on this workflow:",
			textStyle: "listHeading",
		},
		{ text: "" },
	];
	for (let i = 0; i < bundle.parties.length; i++) {
		const p = bundle.parties[i];
		const name = p.displayName?.trim() || "(no display name)";
		partiesLines.push({
			text: `${i + 1}. [${p.role}] ${name} / ${p.email} / ${p.wallet}`,
		});
		if (i < bundle.parties.length - 1) partiesLines.push({ text: "" });
	}
	return partiesLines;
}

export function buildCompliancePdfSummaryFromBundle(
	options: CompliancePdfBundleOptions,
): CompliancePdfSummary {
	return assembleCompliancePdfSummary(options);
}

export function assembleCompliancePdfSummary(
	options: CompliancePdfBundleOptions,
): CompliancePdfSummary {
	const {
		bundle,
		chainName,
		explorerBaseUrl,
		decryptedDocumentMeta,
		verifyWebUrl,
	} = options;

	const signersByRecipient = signersByNormalizedRecipientEmail(bundle.signers);
	const execPlain = buildExecPlain(bundle.executionStatus);

	const fields = buildSummaryFields({
		bundle,
		chainName,
		decryptedDocumentMeta,
	});

	const aboutLines: CompliancePdfLine[] = [
		...buildAboutThisRecordLines(bundle, verifyWebUrl, execPlain),
		{ text: "" },
		...buildTimestampExplainerLines(),
	];

	const partiesLines = buildPartiesLines(bundle);
	const signerMatrix = buildSignerMatrixLines(bundle, explorerBaseUrl);
	const timelineLines = buildSigningTimelineLines(bundle);
	const docMetaLines = buildDocumentMetaLines(decryptedDocumentMeta);
	const placementRef = buildPlacementRefLines(bundle, signersByRecipient);
	const payoutAckLines = buildPayoutAckLines(bundle);
	const settlementLines = buildSettlementLines(bundle, explorerBaseUrl);
	const verifyLines = buildIndependentVerificationLines(verifyWebUrl);

	return {
		explorerBaseUrl,
		fields,
		sections: [
			{ title: "About this record", lines: aboutLines },
			{ title: "Who signed", lines: signerMatrix },
			{ title: "Parties", lines: partiesLines },
			{ title: "Signing timeline", lines: timelineLines },
			...(settlementLines.length > 0
				? [{ title: "Payout packets", lines: settlementLines }]
				: []),
			...(payoutAckLines.length > 0
				? [
						{
							title: "Payout recipient disclosures",
							lines: payoutAckLines,
						},
					]
				: []),
			{ title: "Document details", lines: docMetaLines },
			{ title: "Fields on the document", lines: placementRef },
			{
				title: "How to verify independently",
				lines: verifyLines,
			},
		],
	};
}
