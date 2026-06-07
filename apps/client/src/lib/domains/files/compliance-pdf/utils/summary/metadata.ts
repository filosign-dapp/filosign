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

type SummaryFieldsInput = {
	bundle: ComplianceBundle;
	chainName: string;
	decryptedDocumentMeta?: CompliancePdfBundleOptions["decryptedDocumentMeta"];
};

function formatSenderLabel(bundle: ComplianceBundle): string {
	const senderParty = bundle.parties.find((party) => party.role === "sender");
	if (!senderParty) {
		return bundle.registration.sender;
	}
	const name = senderParty.displayName?.trim();
	if (name && senderParty.email) {
		return `${name} (${senderParty.email})`;
	}
	return senderParty.email || senderParty.wallet;
}

function formatDocumentNames(
	decryptedDocumentMeta: CompliancePdfBundleOptions["decryptedDocumentMeta"],
): string {
	if (!decryptedDocumentMeta?.name?.trim()) {
		return "(unnamed document)";
	}
	return decryptedDocumentMeta.name.trim();
}

function formatSignersSigned(bundle: ComplianceBundle): string {
	const total = bundle.signers.length;
	const signed = bundle.signers.filter((signer) => signer.signed).length;
	return `${signed} of ${total}`;
}

export function buildSummaryFields(input: SummaryFieldsInput) {
	const { bundle, chainName, decryptedDocumentMeta } = input;

	return [
		{
			label: "Workflow status",
			value:
				bundle.executionStatus === "fully_executed" ? "Complete" : "Incomplete",
		},
		{ label: "Generated", value: bundle.exportedAtIso },
		{
			label: "Document",
			value: formatDocumentNames(decryptedDocumentMeta),
		},
		{
			label: "Sender",
			value: formatSenderLabel(bundle),
		},
		{
			label: "Required signers signed",
			value: formatSignersSigned(bundle),
		},
		{ label: "Network", value: chainName },
	];
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
					text: "Document bytes were not available in this session. The proof report still reflects the recorded workflow status.",
					textStyle: "emphasis",
				},
			];
}
