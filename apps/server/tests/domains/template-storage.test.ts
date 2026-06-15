import { describe, expect, test } from "bun:test";
import {
	resolveTemplateDocumentNeedsUpload,
	templateDocumentS3Key,
} from "@/lib/domains/orgs/templates";

describe("resolveTemplateDocumentNeedsUpload", () => {
	const digest = `0x${"ab".repeat(32)}` as `0x${string}`;
	const s3Key = templateDocumentS3Key({
		organizationId: "org-1",
		templateId: "00000000-0000-7000-8000-000000000001",
		docId: "doc-1",
	});

	test("requires upload for new documents", async () => {
		await expect(
			resolveTemplateDocumentNeedsUpload({
				existingPlaintextSha256: undefined,
				requestedPlaintextSha256: digest,
				s3Key,
				probe: { exists: async () => true },
			}),
		).resolves.toBe(true);
	});

	test("requires upload when digest changes", async () => {
		await expect(
			resolveTemplateDocumentNeedsUpload({
				existingPlaintextSha256: digest,
				requestedPlaintextSha256: `0x${"cd".repeat(32)}` as `0x${string}`,
				s3Key,
				probe: { exists: async () => true },
			}),
		).resolves.toBe(true);
	});

	test("requires upload when ciphertext is missing on storage", async () => {
		await expect(
			resolveTemplateDocumentNeedsUpload({
				existingPlaintextSha256: digest,
				requestedPlaintextSha256: digest,
				s3Key,
				probe: { exists: async () => false },
			}),
		).resolves.toBe(true);
	});

	test("skips upload when digest matches and object exists", async () => {
		await expect(
			resolveTemplateDocumentNeedsUpload({
				existingPlaintextSha256: digest,
				requestedPlaintextSha256: digest,
				s3Key,
				probe: { exists: async () => true },
			}),
		).resolves.toBe(false);
	});
});

describe("template prepare update body validation", () => {
	test("requires document digests", async () => {
		const { zOrgsTemplatePrepareUpdateBody } = await import(
			"@/lib/domains/orgs/templates"
		);

		const parsed = zOrgsTemplatePrepareUpdateBody.safeParse({
			templateId: "00000000-0000-7000-8000-000000000001",
			documents: [
				{
					docId: "doc-1",
					name: "nda.pdf",
					size: 100,
					mimeType: "application/pdf",
				},
			],
		});
		expect(parsed.success).toBe(false);
	});
});
