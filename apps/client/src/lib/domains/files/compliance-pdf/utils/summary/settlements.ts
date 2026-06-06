import type { ComplianceBundle } from "@filosign/shared";
import {
	settlementReleaseTypeLabel,
	settlementStatusLabel,
} from "@filosign/shared";
import { formatUnits } from "viem";
import { SUPPORTED_TOKENS } from "@/src/constants";
import type { CompliancePdfLine } from "../../compliance-pdf-types";
import { explorerTxUrl } from "./metadata";

export function buildSettlementLines(
	bundle: ComplianceBundle,
	explorerBaseUrl: string | null,
): CompliancePdfLine[] {
	const settlementLines: CompliancePdfLine[] = [];
	if (bundle.settlements.length > 0) {
		const decimals = SUPPORTED_TOKENS[0]?.decimals ?? 6;
		settlementLines.push(
			{
				text: "These payout packets were attached to the workflow. Status reflects Filosign records at export. Filosign does not guarantee payment, and users remain responsible for payout legality, taxes, invoices, and wallet correctness.",
				textStyle: "lead",
			},
			{ text: "" },
		);
		for (let i = 0; i < bundle.settlements.length; i++) {
			const p = bundle.settlements[i];
			const legSummary = p.legs
				.map(
					(leg) =>
						`${leg.recipientWallet}: ${formatUnits(BigInt(leg.amount), decimals)} USDC`,
				)
				.join("; ");
			settlementLines.push({
				text: `${i + 1}. ${legSummary}`,
			});
			settlementLines.push({
				text: `   Release: ${settlementReleaseTypeLabel(p.releaseType)} - Status: ${settlementStatusLabel(p.status)}`,
			});
			settlementLines.push({ text: `   Rule id: ${p.onChainRuleId}` });
			settlementLines.push({
				text: `   registerRule: ${p.registerRuleTxHash}`,
			});
			settlementLines.push({ text: `   approve: ${p.approveTxHash}` });
			if (p.payoutTxHash) {
				settlementLines.push({ text: `   payout: ${p.payoutTxHash}` });
				if (explorerBaseUrl) {
					const link = explorerTxUrl(explorerBaseUrl, p.payoutTxHash);
					settlementLines.push({ text: `   Link: ${link}`, linkUri: link });
				}
			}
			if (p.lastError) {
				settlementLines.push({ text: `   Error: ${p.lastError}` });
			}
			if (i < bundle.settlements.length - 1) settlementLines.push({ text: "" });
		}
	}
	return settlementLines;
}
