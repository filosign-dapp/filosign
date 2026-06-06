import { describe, expect, test } from "bun:test";
import { dataUrlToBytes } from "../src/lib/upload-user-signature";

describe("dataUrlToBytes", () => {
	test("parses base64 PNG data URLs", async () => {
		const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
		const base64 = btoa(String.fromCharCode(...pngBytes));
		const dataUrl = `data:image/png;base64,${base64}`;

		const parsed = await dataUrlToBytes(dataUrl);

		expect(parsed.contentType).toBe("image/png");
		expect(Array.from(parsed.bytes)).toEqual(Array.from(pngBytes));
	});

	test("parses percent-encoded SVG data URLs from the draw editor", async () => {
		const svg =
			'<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';
		const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

		const parsed = await dataUrlToBytes(dataUrl);

		expect(parsed.contentType).toBe("image/svg+xml");
		expect(new TextDecoder().decode(parsed.bytes)).toBe(svg);
	});

	test("rejects malformed data URLs", async () => {
		await expect(dataUrlToBytes("not-a-data-url")).rejects.toThrow(
			"Invalid data URL",
		);
	});
});
