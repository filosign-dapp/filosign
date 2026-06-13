import { describe, expect, test } from "bun:test";
import {
	buildPracticePlacementManifest,
	WELCOME_PRACTICE_DATE_RECT,
	WELCOME_PRACTICE_DOCUMENT_ID,
	WELCOME_PRACTICE_SIGNATURE_RECT,
	welcomePracticeDocumentSha256,
	welcomePracticePdfBytes,
} from "../activation/welcome-practice";
import {
	WELCOME_PRACTICE_PDF_BYTE_LENGTH,
	WELCOME_PRACTICE_PDF_SHA256,
} from "../activation/welcome-practice.bytes";

describe("welcome practice PDF", () => {
	test("embeds designed PDF bytes (not legacy stub)", () => {
		const bytes = welcomePracticePdfBytes();
		expect(bytes.byteLength).toBe(WELCOME_PRACTICE_PDF_BYTE_LENGTH);
		expect(bytes.byteLength).toBeGreaterThan(5_000);
		expect(bytes[0]).toBe(0x25); // %
		expect(bytes[1]).toBe(0x50); // P
		expect(bytes[2]).toBe(0x44); // D
		expect(bytes[3]).toBe(0x46); // F
	});

	test("sha256 matches committed embed", () => {
		expect(welcomePracticeDocumentSha256()).toBe(WELCOME_PRACTICE_PDF_SHA256);
	});

	test("buildPracticePlacementManifest uses v2 doc and measured field rects", () => {
		const manifest = buildPracticePlacementManifest({
			userEmail: "Partner@Example.com",
		});
		expect(manifest.documents).toHaveLength(1);
		expect(manifest.documents[0]?.id).toBe(WELCOME_PRACTICE_DOCUMENT_ID);
		expect(manifest.documents[0]?.pageCount).toBe(1);
		expect(manifest.fields).toHaveLength(2);

		const signatureField = manifest.fields.find((f) => f.type === "signature");
		expect(signatureField?.required).toBe(true);
		expect(signatureField?.assignedRecipientEmail).toBe("partner@example.com");
		expect(signatureField?.rect).toEqual(WELCOME_PRACTICE_SIGNATURE_RECT);

		const dateField = manifest.fields.find((f) => f.type === "date");
		expect(dateField?.required).toBe(true);
		expect(dateField?.assignedRecipientEmail).toBe("partner@example.com");
		expect(dateField?.rect).toEqual(WELCOME_PRACTICE_DATE_RECT);
	});
});
