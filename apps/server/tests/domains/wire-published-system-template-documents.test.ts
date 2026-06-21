import { afterEach, describe, expect, mock, test } from "bun:test";
import { rpcCatalogGetOutputSchema } from "@/api/orpc/schemas/catalog-output";

const systemTemplateId = "00000000-0000-7000-8000-000000000001";
const plaintextSha256 = `0x${"ab".repeat(32)}` as `0x${string}`;

const mockDocuments = [
	{
		docId: "doc-1",
		name: "nda.pdf",
		size: 1024,
		mimeType: "application/pdf",
		plaintextSha256,
		s3Key: `system-templates/${systemTemplateId}/documents/doc-1.pdf`,
	},
];

const loadSystemTemplateDocuments = mock(() => Promise.resolve(mockDocuments));
const presign = mock(
	(_key: string, _opts: unknown) => "https://example.com/get",
);

const systemTemplateDocuments = {
	systemTemplateId: "systemTemplateId",
};

mock.module("@/lib/platform/db", () => ({
	default: {
		select: () => ({
			from: () => ({
				where: () => loadSystemTemplateDocuments(),
			}),
		}),
		schema: { systemTemplateDocuments },
	},
}));

mock.module("@/lib/platform/s3/client", () => ({
	bucket: { presign },
}));

const { wirePublishedSystemTemplateDocuments } = await import(
	"@/lib/domains/platform/system-templates/templates"
);

afterEach(() => {
	loadSystemTemplateDocuments.mockClear();
	presign.mockClear();
});

describe("wirePublishedSystemTemplateDocuments", () => {
	test("returns presigned download URLs for each document", async () => {
		const documents =
			await wirePublishedSystemTemplateDocuments(systemTemplateId);

		expect(documents).toEqual([
			{
				docId: "doc-1",
				name: "nda.pdf",
				size: 1024,
				mimeType: "application/pdf",
				plaintextSha256,
				downloadUrl: "https://example.com/get",
			},
		]);
		expect(presign).toHaveBeenCalledWith(mockDocuments[0]?.s3Key, {
			method: "GET",
			expiresIn: 300,
		});
	});

	test("catalog.get output schema accepts wired documents", () => {
		const parsed = rpcCatalogGetOutputSchema.safeParse({
			template: {
				id: systemTemplateId,
				name: "NDA",
				meta: {
					category: "contract",
					tags: ["nda"],
					documentVersion: "v1",
				},
				catalogVersionLabel: "v1",
				contentFingerprint: `0x${"cc".repeat(32)}`,
				roleCount: 1,
				fieldCount: 0,
				docCount: 1,
				publishedAt: new Date().toISOString(),
				newerVersionAvailable: false,
				alreadyInstalledInWorkspace: false,
				snapshotJson: {
					version: 1,
					roles: [
						{
							roleId: "signer:alice@template.filosign",
							label: "Signer 1",
							kind: "signer",
							order: 0,
						},
					],
					fields: [],
				},
				documents: [
					{
						docId: "doc-1",
						name: "nda.pdf",
						size: 1024,
						mimeType: "application/pdf",
						plaintextSha256,
						downloadUrl: "https://example.com/get",
					},
				],
			},
		});

		expect(parsed.success).toBe(true);
	});
});
