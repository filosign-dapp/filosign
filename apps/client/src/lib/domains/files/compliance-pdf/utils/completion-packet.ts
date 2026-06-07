import {
	PROOF_PACKET_SCHEMA_V1,
	PROOF_PACKET_V1_DEFAULT_PATHS,
	VERIFY_MANIFEST_FORMAT_V1,
} from "@filosign/oss/proof-packet";
import type { ViewFileResult } from "@filosign/react/files";
import type {
	ComplianceBundle,
	DocumentMerkleLeafProofV1,
} from "@filosign/shared";
import {
	canonicalComplianceBundleJson,
	documentsMerkleProofsV1,
	merkleRootFromLeafAndSiblings,
	parseHexString,
	verifyDocumentMerkleProofV1,
} from "@filosign/shared";
import { zipSync } from "fflate";
import { toast } from "sonner";
import { downloadBlobBytes } from "./build";

const paths = PROOF_PACKET_V1_DEFAULT_PATHS;

function sanitizeZipSegment(name: string): string {
	return name.replace(/[/\\]/g, "_").slice(0, 200) || "document";
}

function proofPacketPath(relative: string): string {
	return `${paths.proofFolder}/${relative}`;
}

function sanitizeDownloadBasename(name: string): string {
	const stem = name.replace(/\.[^./\\]+$/, "").trim();
	const safe = stem
		.replace(/[/\\?%*:|"<>]/g, "_")
		.replace(/\s+/g, " ")
		.trim();
	return safe.slice(0, 80) || "document";
}

/** e.g. `NDA-proof-2026-06-07-bafyTEST12` */
export function buildProofPacketZipFilename(args: {
	documentName: string;
	pieceCid: string;
	exportedAtIso: string;
}): string {
	const base = sanitizeDownloadBasename(args.documentName);
	const date = args.exportedAtIso.slice(0, 10);
	const shortId = args.pieceCid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
	return `${base}-proof-${date}-${shortId}`;
}

export function buildProofPacketReadme(args: {
	bundle: ComplianceBundle;
	bundleHash: `0x${string}`;
	exportId: string;
	chainName: string;
	explorerBaseUrl: string | null;
	verifyWebUrl: string;
	registerDocumentMerkleRoot: string;
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
		"  document-with-proof.pdf  (at the top level of this ZIP)",
		"    The signed document plus proof appendix. Best for sharing with a",
		"    counterparty, grant reviewer, finance team, or internal reviewer.",
		"",
		`  ${paths.proofFolder}/reports/proof-report.pdf`,
		"    The proof record only, without the signed document attached. Best for",
		"    legal, finance, grant, or internal review.",
		"",
		`  ${paths.proofFolder}/documents/original/`,
		"    Original decrypted document file(s) included in this export.",
		"",
		"How to verify independently",
		"---------------------------",
		"Filosign provides an independent verifier for this proof packet.",
		"",
		"  1. Keep this ZIP file.",
		`  2. Open ${args.verifyWebUrl}`,
		"  3. Drop the ZIP file on the page.",
		"",
		"The verifier checks the export against the public ledger and document bytes.",
		"You do not need to open the verification folder for everyday use.",
		"",
		"Verification folder",
		"-------------------",
		`  ${paths.proofFolder}/`,
		"    Supporting files for independent verification tools and manual review.",
		"",
		`  ${paths.proofFolder}/bundle/`,
		"    Machine-readable proof export (bundle.json + bundle.sha256).",
		"",
		`  ${paths.proofFolder}/documents/merkle-proofs.json`,
		"    Document Merkle proofs for on-chain verification.",
		"",
		`  ${paths.proofFolder}/verify-manifest.json`,
		"    Index for verification tools (schema version, paths, chain, registry).",
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
	];
	if (args.explorerBaseUrl) {
		lines.push(
			"",
			`Explorer (registration): ${args.explorerBaseUrl}/tx/${args.bundle.registration.registrationTxHash}`,
		);
	}
	return lines.join("\n");
}

/** @deprecated Use {@link buildProofPacketReadme} */
export const buildCompletionPacketReadme = buildProofPacketReadme;

function registryAddressFromBundle(
	bundle: ComplianceBundle,
): `0x${string}` | null {
	const registrationTx = bundle.transactions.find(
		(transaction) => transaction.kind === "file_registered",
	);
	return registrationTx?.contractAddress ?? null;
}

function buildVerifyManifest(args: {
	bundle: ComplianceBundle;
	bundleHash: `0x${string}`;
}): Record<string, unknown> {
	const registryAddress = registryAddressFromBundle(args.bundle);
	if (!registryAddress) {
		throw new Error(
			"Cannot build verify-manifest.json: missing file_registered transaction",
		);
	}
	return {
		format: VERIFY_MANIFEST_FORMAT_V1,
		packetSchema: PROOF_PACKET_SCHEMA_V1,
		consumerDocumentPath: paths.consumerDocumentFromProofFolder,
		bundlePath: paths.bundle,
		bundleHashPath: paths.bundleHash,
		bundleSha256: args.bundleHash,
		chainId: args.bundle.chainId,
		pieceCid: args.bundle.pieceCid,
		registryAddress,
		documentMerklePath: paths.documentMerkle,
		originalDocumentsPrefix: paths.originalPrefix,
	};
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
	verifyWebUrl: string;
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

	const readme = buildProofPacketReadme({
		bundle: args.bundle,
		bundleHash: args.bundleHash,
		exportId: args.exportId,
		chainName: args.chainName,
		explorerBaseUrl: args.explorerBaseUrl,
		verifyWebUrl: args.verifyWebUrl,
		registerDocumentMerkleRoot: registerRoot,
	});

	const bundleJson = canonicalComplianceBundleJson(args.bundle);
	const verifyManifest = buildVerifyManifest({
		bundle: args.bundle,
		bundleHash: args.bundleHash,
	});

	const merkleProofsJson = JSON.stringify(
		{
			registerDocumentMerkleRoot: registerRoot,
			proofs: proofs.map((p) => ({
				...p,
				recomputedRoot: merkleRootFromLeafAndSiblings(p.leafHash, p.siblings),
			})),
		},
		null,
		2,
	);

	const zipEntries: Record<string, Uint8Array> = {
		[paths.consumerDocument]: args.mergedPdfBytes,
		[proofPacketPath(paths.readme)]: new TextEncoder().encode(readme),
		[proofPacketPath(paths.manifest)]: new TextEncoder().encode(
			JSON.stringify(verifyManifest, null, 2),
		),
		[proofPacketPath(paths.bundle)]: new TextEncoder().encode(bundleJson),
		[proofPacketPath(paths.bundleHash)]: new TextEncoder().encode(
			`${args.bundleHash}\n`,
		),
		[proofPacketPath(paths.documentMerkle)]: new TextEncoder().encode(
			merkleProofsJson,
		),
		[proofPacketPath(paths.proofReport)]: args.compliancePdfBytes,
	};

	for (const doc of args.fileData.documents) {
		const name = sanitizeZipSegment(doc.name);
		zipEntries[proofPacketPath(`${paths.originalPrefix}${name}`)] = doc.bytes;
	}

	const zipped = zipSync(zipEntries, { level: 6 });
	const zipName = buildProofPacketZipFilename({
		documentName:
			args.fileData.metadata.name ??
			args.fileData.documents[0]?.name ??
			"document",
		pieceCid: args.pieceCid,
		exportedAtIso: args.bundle.exportedAtIso,
	});
	downloadBlobBytes(zipped, zipName, "application/zip", "zip");
}
