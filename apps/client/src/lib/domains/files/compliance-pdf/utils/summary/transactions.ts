import type { ComplianceBundle } from "@filosign/shared";
import type { CompliancePdfLine } from "../../compliance-pdf-types";
import { explorerTxUrl } from "./metadata";

export function buildTransactionIndexLines(
	bundle: ComplianceBundle,
	explorerBaseUrl: string | null,
): CompliancePdfLine[] {
	const txIndexLines: CompliancePdfLine[] = [
		{
			text: "Each line is a transaction Filosign associates with this file on the stated chain. Follow explorer links to inspect input data, events, and status. Summaries are descriptive; authoritative identifiers are the hashes and contract addresses printed here.",
			textStyle: "lead",
		},
		{ text: "" },
		{
			text: "Transaction index (file lifecycle on this chain):",
			textStyle: "listHeading",
		},
		{ text: "" },
	];
	for (let i = 0; i < bundle.transactions.length; i++) {
		const t = bundle.transactions[i];
		const head = `${i + 1}. [${t.kind}] ${t.txHash}`;
		txIndexLines.push({ text: head });
		txIndexLines.push({ text: `   Contract: ${t.contractAddress}` });
		txIndexLines.push({ text: `   ${t.summary}` });
		if (t.blockNumber != null) {
			txIndexLines.push({
				text: `   block: ${t.blockNumber}${t.timestamp != null ? ` / blockTime(utc approx): ${new Date(t.timestamp * 1000).toISOString()}` : ""}`,
			});
		}
		if (explorerBaseUrl) {
			const link = explorerTxUrl(explorerBaseUrl, t.txHash);
			txIndexLines.push({ text: `   Link: ${link}`, linkUri: link });
		}
		if (i < bundle.transactions.length - 1) txIndexLines.push({ text: "" });
	}
	return txIndexLines;
}
