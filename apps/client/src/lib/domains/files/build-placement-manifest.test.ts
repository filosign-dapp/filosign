import { describe, expect, it } from "bun:test";
import { buildPlacementManifestForDocument } from "@/src/lib/domains/files/build-placement-manifest";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";

describe("buildPlacementManifestForDocument per-field rect", () => {
	it("uses field width/height instead of global fieldBox", () => {
		const fields: SignatureField[] = [
			{
				id: "f1",
				type: "signature",
				x: 50,
				y: 100,
				width: 200,
				height: 28,
				page: 1,
				documentId: "doc-1",
				assignedSignerWallet: "0xabc",
				assignedSignerName: "Signer",
				assignedSignerEmail: "signer@example.com",
				required: true,
			},
			{
				id: "f2",
				type: "checkbox",
				x: 300,
				y: 200,
				width: 28,
				height: 28,
				page: 1,
				documentId: "doc-1",
				assignedSignerWallet: "0xabc",
				assignedSignerName: "Signer",
				assignedSignerEmail: "signer@example.com",
				required: false,
			},
		];

		const manifest = buildPlacementManifestForDocument({
			docId: "doc-1",
			signerEmailsInOrder: ["signer@example.com"],
			signatureFields: fields,
			docWidth: 600,
			docHeight: 800,
			fieldBox: { width: 148, height: 76 },
		});

		expect(manifest.fields).toHaveLength(2);
		const sig = manifest.fields.find((f) => f.id === "f1");
		const box = manifest.fields.find((f) => f.id === "f2");
		expect(sig?.rect.width).toBeCloseTo(200 / 600, 5);
		expect(sig?.rect.height).toBeCloseTo(28 / 800, 5);
		expect(box?.rect.width).toBeCloseTo(28 / 600, 5);
		expect(box?.rect.height).toBeCloseTo(28 / 800, 5);
	});
});
