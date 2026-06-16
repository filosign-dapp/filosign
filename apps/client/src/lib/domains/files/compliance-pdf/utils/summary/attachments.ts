import type { ComplianceBundle } from "@filosign/shared";
import { COMPLIANCE_EXPORT_PENDING_SATELLITES_LEAD } from "@filosign/shared";
import type { CompliancePdfLine } from "../../compliance-pdf-types";
import { explorerTxUrl } from "./metadata";

export function buildAttachmentLines(
	bundle: ComplianceBundle,
	explorerBaseUrl: string | null,
): CompliancePdfLine[] {
	const attachmentLines: CompliancePdfLine[] = [];
	if (bundle.attachments.length > 0) {
		attachmentLines.push(
			{
				text: "The following files were securely attached to the envelope. Access requires either sender approval (Review Mode) or satisfying the on-chain release conditions (Conditional Mode).",
				textStyle: "lead",
			},
			{ text: "" },
		);
		if (bundle.satelliteWorkflowStatus === "pending") {
			attachmentLines.push({
				text: COMPLIANCE_EXPORT_PENDING_SATELLITES_LEAD,
				textStyle: "emphasis",
			});
			attachmentLines.push({ text: "" });
		}
		for (let i = 0; i < bundle.attachments.length; i++) {
			const a = bundle.attachments[i];
			const label = a.label ? `"${a.label}"` : "Untitled Attachment";
			const mode =
				a.releaseMode === "review"
					? "Review Mode (Sender Approval)"
					: "Conditional Release";
			const status = a.cancelled
				? "Cancelled"
				: a.unlocked
					? "Unlocked"
					: "Locked";

			attachmentLines.push({
				text: `${i + 1}. ${label} (CID: ${a.packetCid})`,
			});
			attachmentLines.push({
				text: `   Release: ${mode} - Status: ${status} - Recipients: ${a.recipientCount}`,
			});
			if (a.packetContentHash) {
				attachmentLines.push({
					text: `   Packet content hash: ${a.packetContentHash}`,
				});
			}
			if (a.releaseMode === "conditional") {
				if (a.onChainRuleId) {
					attachmentLines.push({ text: `   Rule id: ${a.onChainRuleId}` });
				}
				if (a.registerRuleTxHash) {
					attachmentLines.push({
						text: `   registerRule: ${a.registerRuleTxHash}`,
					});
					if (explorerBaseUrl) {
						const link = explorerTxUrl(explorerBaseUrl, a.registerRuleTxHash);
						attachmentLines.push({ text: `   Link: ${link}`, linkUri: link });
					}
				}
				if (a.releaseTxHash) {
					attachmentLines.push({
						text: `   release: ${a.releaseTxHash}`,
					});
					if (explorerBaseUrl) {
						const link = explorerTxUrl(explorerBaseUrl, a.releaseTxHash);
						attachmentLines.push({ text: `   Link: ${link}`, linkUri: link });
					}
				}
			}
			if (i < bundle.attachments.length - 1) attachmentLines.push({ text: "" });
		}
	}
	return attachmentLines;
}
