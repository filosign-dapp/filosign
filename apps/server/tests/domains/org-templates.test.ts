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
	test("requires both crypto head fields", async () => {
		const { zOrgsTemplateCreateBody } = await import(
			"@/api/handlers/orgs/templates-schemas"
		);

		const parsed = zOrgsTemplateCreateBody.safeParse({
			templateId: "00000000-0000-7000-8000-000000000001",
			name: "NDA",
			headDekWrappedOmk: "0x01",
			snapshot: {
				version: 1,
				roles: [
					{
						roleId: "signer:alice@example.com",
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
					s3Key:
						"orgs/org-1/templates/00000000-0000-7000-8000-000000000001/doc-1.bin",
					name: "nda.pdf",
					size: 100,
					mimeType: "application/pdf",
				},
			],
		});
		expect(parsed.success).toBe(false);
	});
});
