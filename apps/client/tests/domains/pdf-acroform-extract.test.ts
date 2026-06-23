import { describe, expect, it } from "bun:test";
import { PDFDocument } from "pdf-lib";
import {
	extractPdfAcroformFields,
	pdfWidgetRectToPlacementPx,
} from "../../src/lib/domains/files/pdf-acroform/extract";
import { acroformFieldsToSignatureFields } from "../../src/lib/domains/files/pdf-acroform/to-signature-fields";

async function buildAcroformFixturePdf(): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	const page = doc.addPage([600, 800]);
	const form = doc.getForm();

	form
		.createTextField("taxpayer_name")
		.addToPage(page, { x: 72, y: 720, width: 300, height: 14 });
	form
		.createTextField("DateSigned")
		.addToPage(page, { x: 72, y: 680, width: 120, height: 14 });
	form
		.createTextField("contact_email")
		.addToPage(page, { x: 72, y: 640, width: 220, height: 14 });
	form.createCheckBox("certify").addToPage(page, {
		x: 72,
		y: 600,
		width: 12,
		height: 12,
	});

	return doc.save();
}

describe("extractPdfAcroformFields", () => {
	it("maps native widgets to placement rects and suggested types", async () => {
		const bytes = await buildAcroformFixturePdf();
		const detected = await extractPdfAcroformFields(bytes);

		expect(detected.length).toBe(4);

		const byName = new Map(
			detected.map((field) => [field.pdfFieldName, field]),
		);
		expect(byName.get("taxpayer_name")?.suggestedType).toBe("name");
		expect(byName.get("DateSigned")?.suggestedType).toBe("date");
		expect(byName.get("contact_email")?.suggestedType).toBe("email");
		expect(byName.get("certify")?.suggestedType).toBe("checkbox");

		const nameField = byName.get("taxpayer_name");
		expect(nameField?.pageIndex).toBe(0);
		expect(nameField?.rect.height).toBeGreaterThan(0);
		expect(nameField?.rect.y).toBeGreaterThan(0);
		expect(nameField?.rect.y).toBeLessThan(800);
	});

	it("returns empty for PDFs without AcroForm fields", async () => {
		const doc = await PDFDocument.create();
		doc.addPage([600, 800]);
		const detected = await extractPdfAcroformFields(await doc.save());
		expect(detected).toEqual([]);
	});
});

describe("pdfWidgetRectToPlacementPx", () => {
	it("converts bottom-left PDF space to top-left placement px", () => {
		const rect = pdfWidgetRectToPlacementPx({
			rect: { x: 100, y: 700, width: 200, height: 20 },
			pageWidth: 600,
			pageHeight: 800,
			viewportWidth: 600,
		});

		expect(rect.x).toBe(100);
		expect(rect.width).toBe(200);
		expect(rect.height).toBe(20);
		expect(rect.y).toBe(800 - 700 - 20);
	});
});

describe("acroformFieldsToSignatureFields", () => {
	it("creates signature fields for the active assignee", () => {
		const fields = acroformFieldsToSignatureFields({
			documentId: "doc-1",
			assignee: {
				id: "signer-1",
				email: "signer@example.com",
				name: "Signer",
				walletAddress: "0xabc",
				isSelf: false,
				required: true,
				placementEnabled: true,
			},
			detected: [
				{
					pageIndex: 0,
					pdfFieldName: "line1",
					suggestedType: "text",
					rect: { x: 10, y: 20, width: 100, height: 12 },
				},
			],
		});

		expect(fields).toHaveLength(1);
		expect(fields[0]?.documentId).toBe("doc-1");
		expect(fields[0]?.page).toBe(1);
		expect(fields[0]?.assignedSignerEmail).toBe("signer@example.com");
		expect(fields[0]?.label).toBe("line1");
	});
});
