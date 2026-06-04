import { describe, expect, it } from "bun:test";
import type { PlacementManifest } from "@filosign/shared";
import { buildValidatedRegisterRouting } from "../src/lib/register-routing";

const manifest: PlacementManifest = {
	version: 1,
	documents: [
		{
			id: "doc1",
			name: "contract.pdf",
			sha256Plaintext: `0x${"cd".repeat(32)}`,
			pageCount: 1,
		},
	],
	fields: [
		{
			id: "f1",
			documentId: "doc1",
			pageIndex: 0,
			rect: { x: 0, y: 0, width: 0.1, height: 0.1 },
			assignedRecipientEmail: "a@example.com",
			required: true,
			type: "signature",
		},
		{
			id: "f2",
			documentId: "doc1",
			pageIndex: 0,
			rect: { x: 0.1, y: 0, width: 0.1, height: 0.1 },
			assignedRecipientEmail: "b@example.com",
			required: true,
			type: "signature",
		},
	],
};

describe("register-routing lib", () => {
	it("defaults to parallel routing", () => {
		const bundle = buildValidatedRegisterRouting({
			placementManifest: manifest,
		});
		expect(bundle.calldata.routingMode).toBe(0);
		expect(bundle.calldata.requiredCommitments).toHaveLength(2);
	});

	it("rejects invalid sequential routing without order", () => {
		expect(() =>
			buildValidatedRegisterRouting({
				placementManifest: manifest,
				routing: { routingMode: 1 },
			}),
		).toThrow();
	});
});
