import { describe, expect, it } from "bun:test";
import type { DraftSnapshot, PlacementField } from "@filosign/shared";
import {
	decryptedDocumentsToViewport,
	fieldCountByDocumentId,
	fieldCountsBySigner,
	placementFieldsFromSnapshot,
} from "../../src/routes/draft/review/-lib/utils/snapshot-to-viewport";

const sampleFields: PlacementField[] = [
	{
		id: "f1",
		documentId: "doc-a",
		pageIndex: 0,
		rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
		assignedRecipientEmail: "alice@example.com",
		required: true,
		type: "signature",
	},
	{
		id: "f2",
		documentId: "doc-a",
		pageIndex: 1,
		rect: { x: 0.2, y: 0.2, width: 0.2, height: 0.1 },
		assignedRecipientEmail: "bob@example.com",
		required: false,
		type: "date",
	},
	{
		id: "f3",
		documentId: "doc-b",
		pageIndex: 0,
		rect: { x: 0.3, y: 0.3, width: 0.2, height: 0.1 },
		assignedRecipientEmail: "alice@example.com",
		required: true,
		type: "initial",
	},
];

const snapshot = (): DraftSnapshot => ({
	recipients: [],
	emailSubject: "",
	emailMessage: "",
	signatureFields: [],
	settlementDrafts: [],
	placementManifest: {
		version: 1,
		documents: [],
		fields: sampleFields,
	},
	documents: [],
});

describe("placementFieldsFromSnapshot", () => {
	it("parses placement manifest fields", () => {
		expect(placementFieldsFromSnapshot(snapshot())).toEqual(sampleFields);
	});

	it("returns empty array when manifest fails validation", () => {
		const bad = snapshot();
		bad.placementManifest = {
			version: 2,
			documents: [],
			fields: sampleFields,
		} as unknown as DraftSnapshot["placementManifest"];
		expect(placementFieldsFromSnapshot(bad)).toEqual([]);
	});
});

describe("fieldCountByDocumentId", () => {
	it("counts fields per document", () => {
		const counts = fieldCountByDocumentId(sampleFields);
		expect(counts.get("doc-a")).toBe(2);
		expect(counts.get("doc-b")).toBe(1);
	});
});

describe("fieldCountsBySigner", () => {
	it("normalizes signer emails and counts fields", () => {
		const counts = fieldCountsBySigner(sampleFields);
		expect(counts.get("alice@example.com")).toBe(2);
		expect(counts.get("bob@example.com")).toBe(1);
	});
});

describe("decryptedDocumentsToViewport", () => {
	it("maps decrypt type property to viewport mimeType", async () => {
		const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
		const docs = await decryptedDocumentsToViewport([
			{
				id: "d1",
				name: "contract.pdf",
				type: "application/pdf",
				bytes: pdfHeader,
			},
		]);
		expect(docs).toHaveLength(1);
		expect(docs[0]?.mimeType).toBe("application/pdf");
		expect(docs[0]?.pdfBytes).toEqual(pdfHeader);
	});
});
