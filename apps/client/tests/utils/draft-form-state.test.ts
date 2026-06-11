import { describe, expect, it } from "bun:test";
import { placementManifestFromCreateForm } from "../../src/lib/domains/drafts/utils/draft-form-state";
import type { CreateForm } from "../../src/lib/domains/files/envelope-form-types";

function minimalForm(overrides: Partial<CreateForm> = {}): CreateForm {
	return {
		draftId: "local-1",
		recipients: [
			{
				clientRowId: "r1",
				name: "Alice",
				email: "alice@example.com",
				role: "signer",
			},
		],
		documents: [],
		signatureFields: [],
		emailSubject: "",
		emailMessage: "",
		settlementDrafts: [],
		...overrides,
	} as CreateForm;
}

describe("placementManifestFromCreateForm", () => {
	it("includes fields from all documents, not only the first", () => {
		const manifest = placementManifestFromCreateForm(
			minimalForm({
				documents: [
					{
						id: "doc-a",
						name: "a.pdf",
						size: 100,
						type: "application/pdf",
						bytes: new Uint8Array(),
					},
					{
						id: "doc-b",
						name: "b.pdf",
						size: 100,
						type: "application/pdf",
						bytes: new Uint8Array(),
					},
				],
				signatureFields: [
					{
						id: "f1",
						documentId: "doc-a",
						page: 1,
						x: 10,
						y: 20,
						assignedSignerEmail: "alice@example.com",
						required: true,
						type: "signature",
					},
					{
						id: "f2",
						documentId: "doc-b",
						page: 1,
						x: 30,
						y: 40,
						assignedSignerEmail: "alice@example.com",
						required: true,
						type: "signature",
					},
				],
			}),
		);

		expect(manifest).not.toBeNull();
		expect(manifest?.fields).toHaveLength(2);
		expect(manifest?.fields.map((f) => f.documentId).sort()).toEqual([
			"doc-a",
			"doc-b",
		]);
	});

	it("returns null when there are no documents", () => {
		expect(placementManifestFromCreateForm(minimalForm())).toBeNull();
	});
});
