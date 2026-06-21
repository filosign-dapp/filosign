import { describe, expect, test } from "bun:test";
import { systemTemplateDocumentStorageKey } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import {
	assertSystemTemplateDeletable,
	assertSystemTemplateDocumentKeys,
	assertSystemTemplatePublishable,
} from "@/lib/domains/platform/system-templates/utils/lifecycle";

function expectAppError(fn: () => void, code: string) {
	try {
		fn();
		throw new Error("expected throw");
	} catch (error) {
		expect(error).toBeInstanceOf(ORPCError);
		const data = (error as { data?: { appCode?: string } }).data;
		expect(data?.appCode).toBe(code);
	}
}

describe("system template lifecycle guards", () => {
	test("assertSystemTemplatePublishable rejects archived templates", () => {
		expectAppError(
			() =>
				assertSystemTemplatePublishable({
					status: "archived",
					documentCount: 1,
				}),
			"PLATFORM.SYSTEM_TEMPLATE_NOT_PUBLISHABLE",
		);
	});

	test("assertSystemTemplatePublishable rejects empty templates", () => {
		expectAppError(
			() =>
				assertSystemTemplatePublishable({
					status: "draft",
					documentCount: 0,
				}),
			"PLATFORM.SYSTEM_TEMPLATE_EMPTY",
		);
	});

	test("assertSystemTemplateDeletable rejects published templates", () => {
		expectAppError(
			() => assertSystemTemplateDeletable("published"),
			"PLATFORM.SYSTEM_TEMPLATE_DELETE_FORBIDDEN",
		);
	});

	test("assertSystemTemplateDocumentKeys rejects invalid s3 keys", () => {
		const systemTemplateId = "00000000-0000-7000-8000-000000000001";
		expectAppError(
			() =>
				assertSystemTemplateDocumentKeys({
					systemTemplateId,
					documents: [{ docId: "doc-1", s3Key: "invalid/key" }],
				}),
			"PLATFORM.SYSTEM_TEMPLATE_INVALID_DOCUMENT_KEY",
		);
	});

	test("assertSystemTemplateDocumentKeys accepts expected s3 keys", () => {
		const systemTemplateId = "00000000-0000-7000-8000-000000000001";
		expect(() =>
			assertSystemTemplateDocumentKeys({
				systemTemplateId,
				documents: [
					{
						docId: "doc-1",
						s3Key: systemTemplateDocumentStorageKey({
							systemTemplateId,
							docId: "doc-1",
						}),
					},
				],
			}),
		).not.toThrow();
	});
});

describe("system template create body validation", () => {
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
		s3Key: systemTemplateDocumentStorageKey({
			systemTemplateId: "00000000-0000-7000-8000-000000000001",
			docId: "doc-1",
		}),
		name: "nda.pdf",
		size: 100,
		mimeType: "application/pdf",
		plaintextSha256: `0x${"ab".repeat(32)}`,
	};

	test("rejects oversize single document", async () => {
		const { zSystemTemplateCreateBody } = await import(
			"@/lib/domains/platform/system-templates/schemas"
		);
		const { MAX_FILE_SIZE } = await import("@/constants");

		const parsed = zSystemTemplateCreateBody.safeParse({
			systemTemplateId: "00000000-0000-7000-8000-000000000001",
			name: "NDA",
			meta: {
				category: "tax",
				tags: [],
				documentVersion: "irs-2024",
			},
			snapshot: baseSnapshot,
			documents: [{ ...baseDoc, size: MAX_FILE_SIZE + 1 }],
		});
		expect(parsed.success).toBe(false);
	});
});
