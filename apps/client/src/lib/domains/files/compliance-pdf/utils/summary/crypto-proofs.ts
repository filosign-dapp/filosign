import type { ComplianceBundle } from "@filosign/shared";
import { LEAF_SCHEMA_VERSION_V1 } from "@filosign/shared";
import type { CompliancePdfLine } from "../../compliance-pdf-types";

function buildMerkleProofSiblingLines(
	siblings: string[],
	childPrefix: string,
): CompliancePdfLine[] {
	const lines: CompliancePdfLine[] = [];
	if (siblings.length === 0) {
		lines.push({
			text: `| ${childPrefix}\`-- (no siblings - single leaf)`,
		});
		return lines;
	}
	if (siblings.length === 1) {
		lines.push({
			text: `| ${childPrefix}\`-- ${siblings[0]}`,
		});
		return lines;
	}

	lines.push({
		text: `| ${childPrefix}\`-- ${siblings.length} siblings:`,
	});
	for (let sIdx = 0; sIdx < siblings.length; sIdx++) {
		const isLastSib = sIdx === siblings.length - 1;
		const sibPrefix = isLastSib ? "`--" : "|--";
		lines.push({
			text: `| ${childPrefix}   ${sibPrefix} ${siblings[sIdx]}`,
		});
	}
	return lines;
}

function buildMerkleProofLines(
	proofs: ComplianceBundle["signers"][number]["merkleProofs"],
): CompliancePdfLine[] {
	const lines: CompliancePdfLine[] = [{ text: "|" }, { text: "| Proofs:" }];
	for (let pIdx = 0; pIdx < proofs.length; pIdx++) {
		const pr = proofs[pIdx];
		const isLastProof = pIdx === proofs.length - 1;
		const proofPrefix = isLastProof ? "`--" : "|--";
		const childPrefix = isLastProof ? "    " : "|   ";

		lines.push({
			text: `| ${proofPrefix} [${pr.fieldId}] leaf ${pr.leafIndex}: ${pr.leafHash}`,
		});
		lines.push(...buildMerkleProofSiblingLines(pr.siblings, childPrefix));
	}
	return lines;
}

function buildSignerCryptoProofBlock(
	s: ComplianceBundle["signers"][number],
	signerNum: number,
): CompliancePdfLine[] {
	const lines: CompliancePdfLine[] = [];
	const statusBadge = s.signed ? "SIGNED" : "NOT SIGNED";
	lines.push({ text: `+-- Signer ${signerNum} ${statusBadge}` });
	lines.push({ text: `| Wallet: ${s.wallet}` });

	if (s.completionsRoot) {
		lines.push({
			text: `| Root:   ${s.completionsRoot}`,
		});
	}

	if (s.completedFieldIds.length > 0) {
		lines.push({
			text: `| Fields: ${s.completedFieldIds.join(", ")}`,
		});
	}

	if (s.merkleProofs.length > 0) {
		lines.push(...buildMerkleProofLines(s.merkleProofs));
	}

	lines.push({ text: "+------------------------------" });
	return lines;
}

export function buildCryptoProofLines(
	bundle: ComplianceBundle,
): CompliancePdfLine[] {
	const cryptoDetail: CompliancePdfLine[] = [
		{
			text: "Cryptographic evidence that each completed field contributes to the signer’s completions root. A reviewer with the manifest, piece CID, placement commitment, and signer address can recompute leaves and verify proofs against the root printed above.",
			textStyle: "lead",
		},
		{ text: "" },
		{
			text: `Merkle completion leaves (v1): keccak256(abi.encode(uint8 leafSchemaVersion=${LEAF_SCHEMA_VERSION_V1}, bytes32 fieldKey, bytes32 placementCommitment, bytes32 pieceCidDigest, address signer)) where fieldKey = keccak256(utf8 bytes of the manifest field id string) and pieceCidDigest = keccak256(utf8 bytes of the piece CID). Implementation: @filosign/shared computeLeafHashV1.`,
			textStyle: "emphasis",
		},
		{ text: "" },
	];

	for (let signerIdx = 0; signerIdx < bundle.signers.length; signerIdx++) {
		const s = bundle.signers[signerIdx];
		cryptoDetail.push(...buildSignerCryptoProofBlock(s, signerIdx + 1));
		if (signerIdx < bundle.signers.length - 1) {
			cryptoDetail.push({ text: "" });
		}
	}

	return cryptoDetail;
}
