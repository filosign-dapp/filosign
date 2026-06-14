import { describe, expect, it } from "bun:test";
import {
	documentLeafHashV1,
	documentsMerkleRootV1,
} from "../utils/document-merkle";
import { sha256PlaintextHex } from "../utils/file-data";

describe("document Merkle v1 (Filosign wiring)", () => {
	it("documentLeafHashV1 delegates to sha256PlaintextHex", async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const leaf = await documentLeafHashV1(bytes);
		const expected = await sha256PlaintextHex(bytes);
		expect(leaf).toBe(expected);
	});

	it("single document root equals leaf hash", async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const root = await documentsMerkleRootV1({
			documents: [{ id: "a", bytes }],
		});
		const leaf = await documentLeafHashV1(bytes);
		expect(root).toBe(leaf);
	});
});
