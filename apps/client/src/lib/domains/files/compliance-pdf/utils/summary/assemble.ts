import type { ComplianceBundle } from "@filosign/shared";
import type {
	CompliancePdfBundleOptions,
	CompliancePdfLine,
	CompliancePdfSummary,
} from "../../compliance-pdf-types";
import {
	buildAboutThisRecordLines,
	buildAppendixLines,
	buildTimestampExplainerLines,
} from "../copy";
import { signersByNormalizedRecipientEmail } from "../placement";
import { buildCryptoProofLines } from "./crypto-proofs";
import { buildAckLines, buildPayoutAckLines, buildViewLines } from "./evidence";
import {
	buildDocumentMetaLines,
	buildExecPlain,
	buildExplorerNote,
	buildSummaryFields,
} from "./metadata";
import { buildOnchainLines } from "./onchain";
import { buildManifestLines, buildPlacementRefLines } from "./placement-ref";
import { buildSettlementLines } from "./settlements";
import { buildSignerMatrixLines } from "./signers";
import { buildTransactionIndexLines } from "./transactions";

/** Section title for appendix; must match the appendix entry in this module. */
export const COMPLIANCE_PDF_APPENDIX_SECTION_TITLE =
	"Appendix: glossary and JSON field map" as const;

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
		bundleHash,
		exportId,
		chainName,
		explorerBaseUrl,
		documentSha256,
		decryptedDocumentMeta,
	} = options;

	const signersByRecipient = signersByNormalizedRecipientEmail(bundle.signers);
	const execPlain = buildExecPlain(bundle.executionStatus);
	const explorerNote = buildExplorerNote(explorerBaseUrl);

	const fields = buildSummaryFields({
		bundle,
		bundleHash,
		exportId,
		chainName,
		explorerBaseUrl,
		documentSha256,
	});

	const aboutLines: CompliancePdfLine[] = [
		...buildAboutThisRecordLines(bundle, explorerNote, execPlain),
		{ text: "" },
		...buildTimestampExplainerLines(),
	];

	const partiesLines = buildPartiesLines(bundle);
	const onchainLines = buildOnchainLines(bundle);
	const txIndexLines = buildTransactionIndexLines(bundle, explorerBaseUrl);
	const signerMatrix = buildSignerMatrixLines(bundle, explorerBaseUrl);
	const docMetaLines = buildDocumentMetaLines(decryptedDocumentMeta);
	const placementRef = buildPlacementRefLines(bundle, signersByRecipient);
	const manifestLines = buildManifestLines(bundle);
	const cryptoDetail = buildCryptoProofLines(bundle);
	const ackLines = buildAckLines(bundle);
	const payoutAckLines = buildPayoutAckLines(bundle);
	const settlementLines = buildSettlementLines(bundle, explorerBaseUrl);
	const viewLines = buildViewLines(bundle);
	const appendixLines: CompliancePdfLine[] = buildAppendixLines();

	return {
		explorerBaseUrl,
		fields,
		sections: [
			{ title: "About this record", lines: aboutLines },
			{ title: "Who signed", lines: signerMatrix },
			{ title: "Parties", lines: partiesLines },
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
				title: "Technical verification: public registration",
				lines: onchainLines,
			},
			{ title: "Technical verification: transactions", lines: txIndexLines },
			{ title: "Technical verification: placement JSON", lines: manifestLines },
			{
				title: "Technical verification: field proofs",
				lines: cryptoDetail,
			},
			...(ackLines.length > 0
				? [{ title: "Off-chain acknowledgements", lines: ackLines }]
				: []),
			...(viewLines.length > 0
				? [{ title: "Document view events", lines: viewLines }]
				: []),
			{
				title: COMPLIANCE_PDF_APPENDIX_SECTION_TITLE,
				lines: appendixLines,
			},
		],
	};
}
