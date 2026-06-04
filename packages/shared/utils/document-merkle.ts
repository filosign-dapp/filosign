import type { Hex } from "viem";
import {
	merkleInclusionSiblings,
	merkleLevelsFromLeaves,
	merkleRootFromLeafAndSiblings,
	merkleRootFromLeaves,
} from "./crypto";
import { sha256PlaintextHex } from "./file-data";

export type DocumentMerkleInput = {
	id: string;
	bytes: Uint8Array;
};

export type DocumentMerkleLeafProofV1 = {
	id: string;
	leafHash: Hex;
	leafIndex: number;
	siblings: Hex[];
};

export async function documentLeafHashV1(bytes: Uint8Array): Promise<Hex> {
	return sha256PlaintextHex(bytes);
}

export async function documentsMerkleRootV1(args: {
	documents: DocumentMerkleInput[];
}): Promise<Hex> {
	if (args.documents.length === 0) {
		throw new Error("documentsMerkleRootV1: at least one document required");
	}
	const sorted = [...args.documents].sort((a, b) => a.id.localeCompare(b.id));
	const leaves = await Promise.all(
		sorted.map((d) => documentLeafHashV1(d.bytes)),
	);
	return merkleRootFromLeaves(leaves);
}

export async function documentsMerkleProofsV1(args: {
	documents: DocumentMerkleInput[];
}): Promise<DocumentMerkleLeafProofV1[]> {
	if (args.documents.length === 0) {
		throw new Error("documentsMerkleProofsV1: at least one document required");
	}
	const sorted = [...args.documents].sort((a, b) => a.id.localeCompare(b.id));
	const leaves = await Promise.all(
		sorted.map((d) => documentLeafHashV1(d.bytes)),
	);
	const levels = merkleLevelsFromLeaves(leaves);
	return sorted.map((doc, leafIndex) => ({
		id: doc.id,
		leafHash: leaves[leafIndex] as Hex,
		leafIndex,
		siblings: merkleInclusionSiblings(levels, leafIndex),
	}));
}

export async function verifyDocumentMerkleProofV1(args: {
	leafBytes: Uint8Array;
	siblings: Hex[];
	expectedRoot: Hex;
}): Promise<boolean> {
	const leafHash = await documentLeafHashV1(args.leafBytes);
	const computed = merkleRootFromLeafAndSiblings(leafHash, args.siblings);
	return computed.toLowerCase() === args.expectedRoot.toLowerCase();
}
