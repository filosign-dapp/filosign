import { describe, expect, test } from "bun:test";
import { orgRoleHasPermission } from "@/lib/domains/orgs/orgs";

describe("org template permissions", () => {
	test("viewer can read templates but not use or write them", () => {
		expect(orgRoleHasPermission("viewer", "templates:read")).toBe(true);
		expect(orgRoleHasPermission("viewer", "templates:use")).toBe(false);
		expect(orgRoleHasPermission("viewer", "templates:write")).toBe(false);
	});

	test("sender can read and use templates but not write them", () => {
		expect(orgRoleHasPermission("sender", "templates:read")).toBe(true);
		expect(orgRoleHasPermission("sender", "templates:use")).toBe(true);
		expect(orgRoleHasPermission("sender", "templates:write")).toBe(false);
	});

	test("admin can read, use, and write templates", () => {
		expect(orgRoleHasPermission("admin", "templates:read")).toBe(true);
		expect(orgRoleHasPermission("admin", "templates:use")).toBe(true);
		expect(orgRoleHasPermission("admin", "templates:write")).toBe(true);
	});
});

describe("template create body validation", () => {
	const baseSnapshot = {
		version: 1 as const,
		roles: [
			{
				roleId: "signer:alice@example.com",
				label: "Signer 1",
				kind: "signer" as const,
				order: 0,
			},
		],
		fields: [],
	};

	const baseDoc = {
		docId: "doc-1",
		s3Key:
			"orgs/org-1/templates/00000000-0000-7000-8000-000000000001/doc-1.bin",
		name: "nda.pdf",
		size: 100,
		mimeType: "application/pdf",
		plaintextSha256: `0x${"ab".repeat(32)}`,
	};

	test("requires both crypto head fields", async () => {
		const { zOrgsTemplateCreateBody } = await import(
			"@/lib/domains/orgs/templates"
		);

		const parsed = zOrgsTemplateCreateBody.safeParse({
			templateId: "00000000-0000-7000-8000-000000000001",
			name: "NDA",
			headDekWrappedOmk: "0x01",
			snapshot: baseSnapshot,
			documents: [baseDoc],
		});
		expect(parsed.success).toBe(false);
	});

	test("rejects oversize single document", async () => {
		const { zOrgsTemplateCreateBody } = await import(
			"@/lib/domains/orgs/templates"
		);
		const { MAX_FILE_SIZE } = await import("@/constants");

		const parsed = zOrgsTemplateCreateBody.safeParse({
			templateId: "00000000-0000-7000-8000-000000000001",
			name: "NDA",
			headDekWrappedOmk: "0x01",
			headOmkKemCiphertext: "0x02",
			snapshot: baseSnapshot,
			documents: [{ ...baseDoc, size: MAX_FILE_SIZE + 1 }],
		});
		expect(parsed.success).toBe(false);
	});

	test("rejects too many documents", async () => {
		const { zOrgsTemplateCreateBody } = await import(
			"@/lib/domains/orgs/templates"
		);
		const { MAX_TEMPLATE_DOCUMENTS } = await import("@/constants");

		const parsed = zOrgsTemplateCreateBody.safeParse({
			templateId: "00000000-0000-7000-8000-000000000001",
			name: "NDA",
			headDekWrappedOmk: "0x01",
			headOmkKemCiphertext: "0x02",
			snapshot: baseSnapshot,
			documents: Array.from({ length: MAX_TEMPLATE_DOCUMENTS + 1 }, (_, i) => ({
				...baseDoc,
				docId: `doc-${i}`,
				s3Key: `orgs/org-1/templates/00000000-0000-7000-8000-000000000001/doc-${i}.bin`,
			})),
		});
		expect(parsed.success).toBe(false);
	});

	test("rejects aggregate size over cap", async () => {
		const { zOrgsTemplateCreateBody } = await import(
			"@/lib/domains/orgs/templates"
		);
		const { MAX_TEMPLATE_TOTAL_BYTES } = await import("@/constants");

		const perDoc = Math.floor(MAX_TEMPLATE_TOTAL_BYTES / 2) + 1;
		const parsed = zOrgsTemplateCreateBody.safeParse({
			templateId: "00000000-0000-7000-8000-000000000001",
			name: "NDA",
			headDekWrappedOmk: "0x01",
			headOmkKemCiphertext: "0x02",
			snapshot: baseSnapshot,
			documents: [
				{ ...baseDoc, docId: "doc-1", size: perDoc },
				{
					...baseDoc,
					docId: "doc-2",
					s3Key:
						"orgs/org-1/templates/00000000-0000-7000-8000-000000000001/doc-2.bin",
					size: perDoc,
				},
			],
		});
		expect(parsed.success).toBe(false);
	});
});

describe("template rename body validation", () => {
	test("requires non-empty name up to 120 chars", async () => {
		const { zOrgsTemplateRenameBody } = await import(
			"@/lib/domains/orgs/templates"
		);

		expect(
			zOrgsTemplateRenameBody.safeParse({
				templateId: "00000000-0000-7000-8000-000000000001",
				name: "",
			}).success,
		).toBe(false);
		expect(
			zOrgsTemplateRenameBody.safeParse({
				templateId: "00000000-0000-7000-8000-000000000001",
				name: "a".repeat(121),
			}).success,
		).toBe(false);
		expect(
			zOrgsTemplateRenameBody.safeParse({
				templateId: "00000000-0000-7000-8000-000000000001",
				name: "DePIN Day",
			}).success,
		).toBe(true);
	});
});
