import type { ComplianceBundle } from "@filosign/shared";
import type { CompliancePdfLine } from "../../compliance-pdf-types";
import { explorerTxUrl } from "./metadata";

function buildSignedSignerDetailLines(
	s: ComplianceBundle["signers"][number],
	explorerBaseUrl: string | null,
): CompliancePdfLine[] {
	const lines: CompliancePdfLine[] = [];
	lines.push({ text: "   Status: SIGNED" });
	if (s.signedAtIso) {
		lines.push({
			text: `   Signed at: ${s.signedAtIso}`,
		});
	}
	if (s.blockTimestampFromTx != null) {
		lines.push({
			text: `   Public record time: ${new Date(s.blockTimestampFromTx * 1000).toISOString()}`,
		});
	}
	if (s.completionsRoot) {
		lines.push({
			text: `   Root: ${s.completionsRoot}`,
		});
	}
	if (s.onchainTxHash) {
		lines.push({ text: `   Tx: ${s.onchainTxHash}` });
		if (explorerBaseUrl) {
			const txLink = explorerTxUrl(explorerBaseUrl, s.onchainTxHash);
			lines.push({ text: `   Link: ${txLink}`, linkUri: txLink });
		}
	}
	if (s.requestIp) {
		lines.push({ text: `   IP: ${s.requestIp}` });
	}
	if (s.requestUserAgent) {
		lines.push({ text: `   User agent: ${s.requestUserAgent}` });
	}
	return lines;
}

function buildUnsignedSignerDetailLines(
	s: ComplianceBundle["signers"][number],
): CompliancePdfLine[] {
	const lines: CompliancePdfLine[] = [{ text: "   Status: NOT SIGNED" }];
	if (s.draftCompletedFieldIds.length > 0) {
		lines.push({
			text: `   Draft fields: ${s.draftCompletedFieldIds.join(", ")}`,
		});
	}
	return lines;
}

function buildSignerIdentityLine(
	s: ComplianceBundle["signers"][number],
): string {
	const parts: string[] = [];
	if (s.displayName) parts.push(s.displayName);
	if (s.email) parts.push(s.email);
	parts.push(s.wallet);
	return parts.join(" / ");
}

export function buildSignerMatrixLines(
	bundle: ComplianceBundle,
	explorerBaseUrl: string | null,
): CompliancePdfLine[] {
	const signerMatrix: CompliancePdfLine[] = [
		{
			text: "Use this section to confirm who signed and when each signature was recorded. Transaction details are available later for technical review.",
			textStyle: "lead",
		},
		{ text: "" },
		{
			text: "Required signers:",
			textStyle: "listHeading",
		},
		{ text: "" },
	];

	for (let i = 0; i < bundle.signers.length; i++) {
		const s = bundle.signers[i];
		signerMatrix.push({ text: `${i + 1}. ${buildSignerIdentityLine(s)}` });
		signerMatrix.push(
			...(s.signed
				? buildSignedSignerDetailLines(s, explorerBaseUrl)
				: buildUnsignedSignerDetailLines(s)),
		);
		if (i < bundle.signers.length - 1) {
			signerMatrix.push({ text: "" });
		}
	}

	return signerMatrix;
}
