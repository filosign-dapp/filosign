import { describe, expect, it } from "bun:test";
import {
	canonicalPlacementManifestJson,
	computePlacementCommitment,
	zPlacementManifest,
} from "..";

const minimalManifest = zPlacementManifest.parse({
	version: 1,
	documents: [
		{
			id: "doc1",
			name: "contract.pdf",
			sha256Plaintext: `0x${"ab".repeat(32)}`,
			pageCount: 1,
		},
	],
	fields: [
		{
			id: "f1",
			documentId: "doc1",
			pageIndex: 0,
			rect: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
			assignedRecipientEmail: "signer@example.com",
			required: true,
			type: "signature",
		},
	],
});

describe("computePlacementCommitment", () => {
	it("is stable across repeated canonical serialization", () => {
		const c1 = computePlacementCommitment(minimalManifest);
		const c2 = computePlacementCommitment(minimalManifest);
		expect(c1).toBe(c2);
	});

	it("canonical JSON key order does not affect commitment", () => {
		const raw = JSON.parse(canonicalPlacementManifestJson(minimalManifest));
		const commitment = computePlacementCommitment(minimalManifest);
		const permuted = {
			fields: raw.fields,
			documents: raw.documents,
			version: raw.version,
		};
		const recommit = computePlacementCommitment(
			zPlacementManifest.parse(permuted),
		);
		expect(recommit).toBe(commitment);
	});
});
