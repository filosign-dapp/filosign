import { describe, expect, it } from "bun:test";
import { normalizeDrawnSignatureSvg } from "../../src/routes/dashboard/signature/create/-lib/utils/signature-svg";

describe("normalizeDrawnSignatureSvg", () => {
	it("sets HQ canvas dimensions for signatures while preserving viewBox", () => {
		const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><path d="M0 0"/></svg>`;
		const normalized = normalizeDrawnSignatureSvg(raw, "signature");

		expect(normalized).toContain('width="520"');
		expect(normalized).toContain('height="140"');
		expect(normalized).toContain('viewBox="0 0 120 40"');
	});

	it("sets smaller HQ canvas dimensions for initials", () => {
		const raw = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="32"><path d="M0 0"/></svg>`;
		const normalized = normalizeDrawnSignatureSvg(raw, "initial");

		expect(normalized).toContain('width="200"');
		expect(normalized).toContain('height="80"');
		expect(normalized).toContain('viewBox="0 0 80 32"');
	});

	it("falls back to exported bounds when viewBox is missing", () => {
		const raw = `<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>`;
		const normalized = normalizeDrawnSignatureSvg(raw, "signature", {
			exportedWidth: 160,
			exportedHeight: 48,
		});

		expect(normalized).toContain('viewBox="0 0 160 48"');
	});
});
