import type { ComplianceBundle } from "@filosign/shared";
import type {
	CompliancePdfBundleOptions,
	CompliancePdfLine,
} from "../../compliance-pdf-types";

export function explorerTxUrl(explorerBase: string, txHash: string): string {
	const base = explorerBase.replace(/\/$/, "");
	return `${base}/tx/${txHash}`;
}

export function buildExecPlain(
	executionStatus: ComplianceBundle["executionStatus"],
): string {
	return executionStatus === "fully_executed"
		? "Complete - every required signer had a recorded signature when this report was exported."
		: "Incomplete - at least one required signer had not recorded a signature when this report was exported.";
}

export function buildExplorerNote(explorerBaseUrl: string | null): string {
	const hasExplorerLinks = Boolean(explorerBaseUrl);
	return hasExplorerLinks
		? "Transaction links appear in the technical verification section for reviewers who need them."
		: "No block explorer is configured for this network. Technical reviewers can still use the network ID and transaction hashes provided later in this report.";
}

type SummaryFieldsInput = {
	bundle: ComplianceBundle;
	bundleHash: `0x${string}`;
	exportId: string;
	chainName: string;
	explorerBaseUrl: string | null;
	documentSha256?: string;
};

export function buildSummaryFields(input: SummaryFieldsInput) {
	const {
		bundle,
		bundleHash,
		exportId,
		chainName,
		explorerBaseUrl,
		documentSha256,
	} = input;

	const regTxLink =
		explorerBaseUrl && bundle.registration.registrationTxHash
			? explorerTxUrl(explorerBaseUrl, bundle.registration.registrationTxHash)
			: null;

	const fields: Array<{
		label: string;
		value: string;
		linkUri?: string | null;
	}> = [
		{
			label: "Workflow status",
			value:
				bundle.executionStatus === "fully_executed" ? "Complete" : "Incomplete",
		},
		{ label: "Generated", value: bundle.exportedAtIso },
		{ label: "Sender wallet", value: bundle.registration.sender },
		{ label: "Network", value: `${chainName} (${bundle.chainId})` },
		{ label: "Export ID", value: exportId },
		{ label: "Proof export hash", value: bundleHash },
		{ label: "Document storage ID", value: bundle.pieceCid },
		{
			label: "Registration tx",
			value: bundle.registration.registrationTxHash,
		},
	];

	const registerHash =
		bundle.registration.registerDocumentSha256 ?? documentSha256;
	if (registerHash) {
		fields.push({
			label: "Document verification root",
			value: registerHash,
		});
		fields.push({
			label: "Document verification method",
			value:
				"Root over document hashes. Technical reviewers can use the proof packet JSON to verify individual files.",
		});
	}

	if (regTxLink) {
		fields.push({
			label: "Registration explorer link",
			value: regTxLink,
			linkUri: regTxLink,
		});
	}

	return fields;
}

export function buildDocumentMetaLines(
	decryptedDocumentMeta: CompliancePdfBundleOptions["decryptedDocumentMeta"],
): CompliancePdfLine[] {
	return decryptedDocumentMeta
		? [
				{
					text: "These are the file details available when this report was created. Keep them with the proof packet if you need to match this report back to the downloaded document.",
					textStyle: "lead",
				},
				{ text: "" },
				{
					text: "Document included in this export:",
					textStyle: "listHeading",
				},
				{ text: "" },
				{
					text: `Name: ${decryptedDocumentMeta.name ?? "(unnamed)"} / ${decryptedDocumentMeta.mimeType ?? "-"} / ${String(decryptedDocumentMeta.sizeBytes)} bytes`,
				},
				{
					text: "Note: The proof packet ZIP includes the original file when you download the full packet.",
					textStyle: "emphasis",
				},
			]
		: [
				{
					text: "Document bytes were not available in this session. The proof report still reflects the recorded workflow status and verification anchors.",
					textStyle: "emphasis",
				},
			];
}
