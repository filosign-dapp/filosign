import { describe, expect, it } from "bun:test";
import type { Address, Hex } from "viem";
import {
	concat,
	encodeAbiParameters,
	hexToBigInt,
	keccak256,
	stringToBytes,
} from "viem";
import {
	completionsMerkleProofsV1,
	completionsMerkleRootV1,
	computeLeafHashV1,
	fieldIdToBytes32,
	LEAF_SCHEMA_VERSION_V1,
	merkleRootFromLeafAndSiblings,
	merkleRootFromLeaves,
} from "..";

const signer = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as Address;
const placementCommitment =
	"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hex;
const pieceCid = "bafyTESTpiececid";

describe("computeLeafHashV1", () => {
	it("matches manual keccak256(abi.encode(...))", () => {
		const fieldId = "field-a";
		const pieceDigest = keccak256(stringToBytes(pieceCid));
		const fieldKey = fieldIdToBytes32(fieldId);
		const encoded = encodeAbiParameters(
			[
				{ type: "uint8", name: "leafSchemaVersion" },
				{ type: "bytes32", name: "fieldId" },
				{ type: "bytes32", name: "placementCommitment" },
				{ type: "bytes32", name: "pieceCidDigest" },
				{ type: "address", name: "signer" },
			],
			[
				LEAF_SCHEMA_VERSION_V1,
				fieldKey,
				placementCommitment,
				pieceDigest,
				signer,
			],
		);
		const expected = keccak256(encoded);
		const got = computeLeafHashV1({
			fieldId,
			placementCommitment,
			pieceCid,
			signer,
		});
		expect(got).toBe(expected);
	});
});

/** Pairing used by merkleRootFromLeaves (ordered by uint value). */
function pairHash(a: Hex, b: Hex): Hex {
	const [left, right] = hexToBigInt(a) <= hexToBigInt(b) ? [a, b] : [b, a];
	return keccak256(concat([left as `0x${string}`, right as `0x${string}`]));
}

describe("merkleRootFromLeaves", () => {
	it("rejects empty input", () => {
		expect(() => merkleRootFromLeaves([])).toThrow();
	});

	it("single leaf is the root", () => {
		const a = computeLeafHashV1({
			fieldId: "a",
			placementCommitment,
			pieceCid,
			signer,
		});
		expect(merkleRootFromLeaves([a])).toBe(a);
	});

	it("two leaves: hashes pair with deterministic order", () => {
		const a = computeLeafHashV1({
			fieldId: "a",
			placementCommitment,
			pieceCid,
			signer,
		});
		const b = computeLeafHashV1({
			fieldId: "b",
			placementCommitment,
			pieceCid,
			signer,
		});
		expect(merkleRootFromLeaves([a, b])).toBe(pairHash(a, b));
	});

	it("odd count duplicates last leaf at this level", () => {
		const a = computeLeafHashV1({
			fieldId: "a",
			placementCommitment,
			pieceCid,
			signer,
		});
		const b = computeLeafHashV1({
			fieldId: "b",
			placementCommitment,
			pieceCid,
			signer,
		});
		const c = computeLeafHashV1({
			fieldId: "c",
			placementCommitment,
			pieceCid,
			signer,
		});
		const ab = pairHash(a, b);
		const cc = pairHash(c, c);
		expect(merkleRootFromLeaves([a, b, c])).toBe(pairHash(ab, cc));
	});
});

describe("completionsMerkleRootV1", () => {
	it("dedupes field ids and sorts lexicographically (document order in tests)", () => {
		const rootDup = completionsMerkleRootV1({
			fieldIds: ["b", "a", "a"],
			placementCommitment,
			pieceCid,
			signer,
		});
		const rootNorm = completionsMerkleRootV1({
			fieldIds: ["a", "b"],
			placementCommitment,
			pieceCid,
			signer,
		});
		expect(rootDup).toBe(rootNorm);
	});

	it("matches manual build for two sorted ids", () => {
		const ids = ["alpha", "beta"];
		const leaves = ids.map((fieldId) =>
			computeLeafHashV1({
				fieldId,
				placementCommitment,
				pieceCid,
				signer,
			}),
		);
		const manual = merkleRootFromLeaves(leaves);
		const got = completionsMerkleRootV1({
			fieldIds: ["beta", "alpha"],
			placementCommitment,
			pieceCid,
			signer,
		});
		expect(got).toBe(manual);
	});
});

describe("completionsMerkleProofsV1", () => {
	it("each proof verifies to the same root as completionsMerkleRootV1", () => {
		const fieldIds = ["alpha", "beta", "gamma"];
		const root = completionsMerkleRootV1({
			fieldIds,
			placementCommitment,
			pieceCid,
			signer,
		});
		const proofs = completionsMerkleProofsV1({
			fieldIds,
			placementCommitment,
			pieceCid,
			signer,
		});
		expect(proofs).toHaveLength(3);
		for (const p of proofs) {
			const computed = merkleRootFromLeafAndSiblings(p.leafHash, p.siblings);
			expect(computed).toBe(root);
		}
	});

	it("single-field proof has empty siblings", () => {
		const fieldIds = ["only-one"];
		const root = completionsMerkleRootV1({
			fieldIds,
			placementCommitment,
			pieceCid,
			signer,
		});
		const proofs = completionsMerkleProofsV1({
			fieldIds,
			placementCommitment,
			pieceCid,
			signer,
		});
		expect(proofs[0]?.siblings).toEqual([]);
		expect(proofs[0]?.leafHash).toBe(root);
	});
});
