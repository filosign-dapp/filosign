import type { ViewFileResult } from "@filosign/react/files";
import type {
	ComplianceBundle,
	DocumentMerkleLeafProofV1,
} from "@filosign/shared";
import {
	documentsMerkleProofsV1,
	merkleRootFromLeafAndSiblings,
	parseHexString,
	verifyDocumentMerkleProofV1,
} from "@filosign/shared";
import { zipSync } from "fflate";
import { toast } from "sonner";
import { downloadBlobBytes } from "./build";

function sanitizeZipSegment(name: string): string {
	return name.replace(/[/\\]/g, "_").slice(0, 200) || "document";
}

export function buildCompletionPacketReadme(args: {
	bundle: ComplianceBundle;
	bundleHash: `0x${string}`;
	exportId: string;
	chainName: string;
	explorerBaseUrl: string | null;
	registerDocumentMerkleRoot: string;
	proofs: DocumentMerkleLeafProofV1[];
}): string {
	const lines = [
		"Filosign proof packet",
		"=====================",
		"",
		"What this is",
		"------------",
		"This packet is your archive of a completed Filosign signing workflow.",
		"Keep it with the signed agreement. It helps show who participated, what was",
		"signed, when signatures were recorded, and what proof or payout events were",
		"attached to the workflow.",
		"",
		"What to open first",
		"------------------",
		"  document-with-proof.pdf",
		"    The signed document plus proof appendix. Best for sharing with a",
		"    counterparty, grant reviewer, finance team, or internal reviewer.",
		"",
		"  proof-report.pdf",
		"    The proof record only. Best when someone needs the signing record without",
		"    the original document attached.",
		"",
		"  original/",
		"    The original decrypted document file(s) included in this export.",
		"",
		"  document-merkle-proofs.json",
		"    Technical verification data. Most users do not need this file.",
		"",
		"Important note",
		"--------------",
		"This packet is evidence of a Filosign workflow. It is not legal advice and",
		"does not decide whether a document is valid for your jurisdiction or use case.",
		"",
		"Technical identifiers",
		"---------------------",
		`Export ID: ${args.exportId}`,
		`Generated at: ${args.bundle.exportedAtIso}`,
		`Network: ${args.chainName} (${args.bundle.chainId})`,
		`Document storage ID: ${args.bundle.pieceCid}`,
		`Document verification root: ${args.registerDocumentMerkleRoot}`,
		`Proof export hash: ${args.bundleHash}`,
		`Registration transaction: ${args.bundle.registration.registrationTxHash}`,
		"",
		"Per-document technical proof summary",
		"------------------------------------",
	];
	for (const p of args.proofs) {
		lines.push(
			`  Document ${p.id}: leaf=${p.leafHash} index=${p.leafIndex} siblings=${p.siblings.length}`,
		);
	}
	if (args.explorerBaseUrl) {
		lines.push(
			"",
			`Explorer (registration): ${args.explorerBaseUrl}/tx/${args.bundle.registration.registrationTxHash}`,
		);
	}
	return lines.join("\n");
}

export async function warnDocumentMerkleMismatch(args: {
	fileData: ViewFileResult;
	expectedRoot: string;
	proofs: DocumentMerkleLeafProofV1[];
}): Promise<void> {
	const root = args.expectedRoot.toLowerCase();
	const recomputedRoot = args.fileData.registerDocumentSha256.toLowerCase();
	if (recomputedRoot !== root) {
		toast.warning("Document Merkle root mismatch", {
			description:
				"Recomputed root from decrypted documents does not match the register-time root.",
		});
	}

	const docInputs = args.fileData.documents.map((d) => ({
		id: d.id,
		name: d.name,
		bytes: d.bytes,
	}));

	for (const doc of docInputs) {
		const proof = args.proofs.find((p) => p.id === doc.id);
		if (!proof) continue;
		const ok = await verifyDocumentMerkleProofV1({
			leafBytes: doc.bytes,
			siblings: proof.siblings,
			expectedRoot: parseHexString(args.expectedRoot),
		});
		if (!ok) {
			toast.warning(`Merkle proof failed for ${doc.name}`, {
				description: `${doc.name} does not verify against the on-chain document Merkle root.`,
			});
		}
	}
}

export async function downloadCompletionPacketZip(args: {
	bundle: ComplianceBundle;
	bundleHash: `0x${string}`;
	exportId: string;
	fileData: ViewFileResult;
	compliancePdfBytes: Uint8Array;
	mergedPdfBytes: Uint8Array;
	chainName: string;
	explorerBaseUrl: string | null;
	pieceCid: string;
}): Promise<void> {
	const registerRoot =
		args.bundle.registration.registerDocumentSha256 ??
		args.fileData.registerDocumentSha256;

	const merkleDocs = args.fileData.documents.map((d) => ({
		id: d.id,
		bytes: d.bytes,
	}));

	const proofs = await documentsMerkleProofsV1({ documents: merkleDocs });
	await warnDocumentMerkleMismatch({
		fileData: args.fileData,
		expectedRoot: registerRoot,
		proofs,
	});

	const readme = buildCompletionPacketReadme({
		bundle: args.bundle,
		bundleHash: args.bundleHash,
		exportId: args.exportId,
		chainName: args.chainName,
		explorerBaseUrl: args.explorerBaseUrl,
		registerDocumentMerkleRoot: registerRoot,
		proofs,
	});

	const zipEntries: Record<string, Uint8Array> = {
		"README.txt": new TextEncoder().encode(readme),
		"document-merkle-proofs.json": new TextEncoder().encode(
			JSON.stringify(
				{
					registerDocumentMerkleRoot: registerRoot,
					proofs: proofs.map((p) => ({
						...p,
						recomputedRoot: merkleRootFromLeafAndSiblings(
							p.leafHash,
							p.siblings,
						),
					})),
				},
				null,
				2,
			),
		),
		"proof-report.pdf": args.compliancePdfBytes,
		"document-with-proof.pdf": args.mergedPdfBytes,
	};

	for (const doc of args.fileData.documents) {
		const name = sanitizeZipSegment(doc.name);
		zipEntries[`original/${name}`] = doc.bytes;
	}

	const zipped = zipSync(zipEntries, { level: 6 });
	const safe = args.pieceCid.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
	downloadBlobBytes(
		zipped,
		`filosign-proof-packet-${safe}`,
		"application/zip",
		"zip",
	);
}
