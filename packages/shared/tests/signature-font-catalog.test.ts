import { describe, expect, test } from "bun:test";
import {
	buildSignatureFontOptions,
	deriveSignatureInitials,
	getSignatureFontCatalogEntry,
	getSignatureFontRasterSpec,
	getSignaturePreviewClassForRole,
	resolveSignatureFontId,
	resolveSignerDisplayName,
	resolveTypedSignatureText,
	SIGNATURE_FONT_IDS,
	signatureFontsourcePackages,
} from "@filosign/shared";

describe("signature-font-catalog", () => {
	test("exports seven distinct font ids", () => {
		expect(SIGNATURE_FONT_IDS).toHaveLength(7);
		expect(new Set(SIGNATURE_FONT_IDS).size).toBe(7);
	});

	test("maps legacy font ids to canonical catalog ids", () => {
		expect(resolveSignatureFontId("homemade-apple")).toBe("dancing-script");
		expect(resolveSignatureFontId("gloria-hallelujah")).toBe("great-vibes");
		expect(resolveSignatureFontId("nothing-you-could-do")).toBe("caveat");
		expect(resolveSignatureFontId("reenie-beanie")).toBe("satisfy");
		expect(resolveSignatureFontId("mr-dafoe")).toBe("alex-brush");
	});

	test("derives initials from profile names", () => {
		expect(deriveSignatureInitials("Jane", "Doe")).toBe("JD");
		expect(deriveSignatureInitials("Jane", "")).toBe("J");
		expect(deriveSignatureInitials("", "Doe")).toBe("");
	});

	test("resolveSignerDisplayName and resolveTypedSignatureText fallbacks", () => {
		expect(
			resolveSignerDisplayName({
				firstName: "Jane",
				lastName: "Doe",
				email: "j@example.com",
			}),
		).toBe("Jane Doe");

		expect(
			resolveSignerDisplayName({
				email: "alice@example.com",
			}),
		).toBe("alice");

		expect(resolveSignerDisplayName({ username: "bob" })).toBe("bob");
		expect(resolveSignerDisplayName({})).toBe("Signer");

		expect(
			resolveTypedSignatureText({
				role: "signature",
				profile: { firstName: "Jane", lastName: "Doe" },
			}),
		).toBe("Jane Doe");

		expect(
			resolveTypedSignatureText({
				role: "initial",
				profile: { firstName: "Jane", lastName: "Doe" },
			}),
		).toBe("JD");

		expect(
			resolveTypedSignatureText({
				role: "initial",
				profile: { email: "alice@example.com" },
			}),
		).toBe("A");
	});

	test("buildSignatureFontOptions maps catalog labels", () => {
		const options = buildSignatureFontOptions({
			signatureText: "Jane Doe",
			initialsText: "JD",
		});
		expect(options).toHaveLength(7);
		expect(options[1]?.label).toBe("Dancing Script");
	});

	test("preview and raster specs share one catalog entry", () => {
		const entry = getSignatureFontCatalogEntry("homemade-apple");
		expect(entry.id).toBe("dancing-script");
		expect(
			getSignaturePreviewClassForRole("homemade-apple", "initial"),
		).toContain(entry.initialTextClass);
		expect(
			getSignatureFontRasterSpec("homemade-apple", "initial").fontSize,
		).toBe(entry.initialFontSize);
	});

	test("lists fontsource packages for script fonts", () => {
		const packages = signatureFontsourcePackages();
		expect(packages).toContain("@fontsource/dancing-script");
		expect(packages).not.toContain(undefined);
	});
});
