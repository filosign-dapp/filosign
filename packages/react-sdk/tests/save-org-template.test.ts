import { describe, expect, test } from "bun:test";
import { KEM, randomBytes, toHex } from "@filosign/crypto-utils";
import { sha256PlaintextHex } from "@filosign/shared";
import {
	type SaveOrgTemplateDeps,
	saveOrgTemplateCreate,
	saveOrgTemplateUpdate,
} from "../src/lib/save-org-template/save-org-template";

const digest = `0x${"11".repeat(32)}` as const;
const templateId = "00000000-0000-7000-8000-000000000001";
const organizationId = "00000000-0000-7000-8000-000000000002";
const walletAddress = `0x${"aa".repeat(20)}` as `0x${string}`;

function mockDeps(args: {
	prepared: Array<{
		docId: string;
		s3Key: string;
		needsUpload: boolean;
		uploadUrl?: string;
	}>;
}): SaveOrgTemplateDeps {
	return {
		wallet: {
			account: {
				address: walletAddress,
			},
		} as SaveOrgTemplateDeps["wallet"],
		prepareCreate: (async () => ({
			templateId,
			documents: args.prepared,
		})) as SaveOrgTemplateDeps["prepareCreate"],
		create: (async (body: unknown) =>
			body) as unknown as SaveOrgTemplateDeps["create"],
		prepareUpdate: (async () => ({
			templateId,
			documents: args.prepared,
		})) as SaveOrgTemplateDeps["prepareUpdate"],
		update: (async (body: unknown) =>
			body) as unknown as SaveOrgTemplateDeps["update"],
		fetchTemplateHead: (async () => ({
			template: {
				id: templateId,
				organizationId,
				name: "NDA",
				createdByWallet: walletAddress,
				createdAt: new Date(),
				updatedAt: new Date(),
				headDekWrappedOmk: "0x01",
				headOmkKemCiphertext: "0x02",
				snapshotJson: { version: 1, roles: [], fields: [] },
				roleCount: 0,
				fieldCount: 0,
			},
			documents: [],
		})) as SaveOrgTemplateDeps["fetchTemplateHead"],
		wrapForMine: (async () => ({
			wrappedOmk: "0x03",
			wrapKemCiphertext: "0x04",
		})) as SaveOrgTemplateDeps["wrapForMine"],
	};
}

describe("saveOrgTemplateUpdate", () => {
	test("skips document PUT when prepare marks needsUpload false", async () => {
		const puts: string[] = [];
		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (
			input: RequestInfo | URL,
			init?: RequestInit,
		) => {
			if (init?.method === "PUT") {
				puts.push(String(input));
			}
			return new Response(null, { status: 200 });
		}) as typeof fetch;

		try {
			const { setCachedTemplateDek } = await import(
				"../src/lib/template-dek-cache"
			);
			setCachedTemplateDek(templateId, walletAddress, new Uint8Array(32));

			const deps = mockDeps({
				prepared: [
					{
						docId: "doc-1",
						s3Key: "orgs/org/templates/t/doc-1.bin",
						needsUpload: false,
					},
				],
			});
			let updatePayload: Record<string, unknown> | undefined;
			deps.update = (async (body: unknown) => {
				updatePayload = body as Record<string, unknown>;
				return { template: { id: templateId } };
			}) as unknown as SaveOrgTemplateDeps["update"];

			await saveOrgTemplateUpdate(deps, {
				templateId,
				organizationId,
				orgEncryptionPublicKey: "0x05",
				name: "NDA",
				snapshot: {
					version: 1,
					roles: [
						{
							roleId: "role_a",
							label: "Signer",
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
						size: 10,
						mimeType: "application/pdf",
						plaintextSha256: digest,
					},
				],
				loadDocumentBytes: async () => {
					throw new Error("should not load bytes for unchanged doc");
				},
			});

			expect(puts).toHaveLength(0);
			expect(updatePayload?.name).toBe("NDA");
			expect(updatePayload).not.toHaveProperty("headDekWrappedOmk");
			expect(updatePayload).not.toHaveProperty("headOmkKemCiphertext");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});

describe("saveOrgTemplateCreate", () => {
	test("uploads every prepared document on create", async () => {
		const puts: string[] = [];
		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (
			input: RequestInfo | URL,
			init?: RequestInit,
		) => {
			if (init?.method === "PUT") {
				puts.push(String(input));
			}
			return new Response(null, { status: 200 });
		}) as typeof fetch;

		try {
			const deps = mockDeps({
				prepared: [
					{
						docId: "doc-1",
						s3Key: "orgs/org/templates/t/doc-1.bin",
						needsUpload: true,
						uploadUrl: "https://example.test/upload",
					},
				],
			});

			const bytes = new TextEncoder().encode("pdf");
			const { publicKey: omkPublic } = await KEM.keyGen({
				seed: randomBytes(64),
			});
			await saveOrgTemplateCreate(deps, {
				templateId,
				organizationId,
				orgEncryptionPublicKey: toHex(omkPublic),
				name: "NDA",
				snapshot: {
					version: 1,
					roles: [
						{
							roleId: "role_a",
							label: "Signer",
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
						size: bytes.byteLength,
						mimeType: "application/pdf",
						plaintextSha256: await sha256PlaintextHex(bytes),
					},
				],
				loadDocumentBytes: async () => bytes,
			});

			expect(puts).toEqual(["https://example.test/upload"]);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
