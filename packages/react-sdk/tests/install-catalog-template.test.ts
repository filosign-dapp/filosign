import { describe, expect, test } from "bun:test";
import { KEM, randomBytes, toHex } from "@filosign/crypto-utils";
import {
	type InstallCatalogTemplateDeps,
	installCatalogTemplate,
} from "../src/lib/install-catalog-template/install-catalog-template";

const templateId = "00000000-0000-7000-8000-000000000001";
const systemTemplateId = "00000000-0000-7000-8000-000000000002";
const organizationId = "00000000-0000-7000-8000-000000000003";
const walletAddress = `0x${"aa".repeat(20)}` as `0x${string}`;
const fingerprintV1 = `0x${"bb".repeat(32)}`;

const baseSnapshot = {
	version: 1 as const,
	roles: [
		{
			roleId: "signer:alice@template.filosign",
			label: "Signer 1",
			kind: "signer" as const,
			order: 0,
		},
	],
	fields: [],
};

function mockInstallDeps(args: {
	create: InstallCatalogTemplateDeps["create"];
	prepared: Array<{
		docId: string;
		s3Key: string;
		needsUpload: boolean;
		uploadUrl?: string;
	}>;
}): InstallCatalogTemplateDeps {
	return {
		wallet: {
			account: {
				address: walletAddress,
			},
		} as InstallCatalogTemplateDeps["wallet"],
		prepareCreate: (async () => ({
			templateId,
			documents: args.prepared,
		})) as InstallCatalogTemplateDeps["prepareCreate"],
		create: args.create,
		prepareUpdate: (async () => ({
			templateId,
			documents: args.prepared,
		})) as InstallCatalogTemplateDeps["prepareUpdate"],
		update: (async (body: unknown) =>
			body) as unknown as InstallCatalogTemplateDeps["update"],
		fetchTemplateHead: (async () => ({
			template: {
				id: templateId,
				organizationId,
				name: "W-9",
				createdByWallet: walletAddress,
				createdAt: new Date(),
				updatedAt: new Date(),
				headDekWrappedOmk: "0x01",
				headOmkKemCiphertext: "0x02",
				snapshotJson: baseSnapshot,
				roleCount: 1,
				fieldCount: 0,
			},
			documents: [],
		})) as InstallCatalogTemplateDeps["fetchTemplateHead"],
		wrapForMine: (async () => ({
			wrappedOmk: "0x03",
			wrapKemCiphertext: "0x04",
		})) as InstallCatalogTemplateDeps["wrapForMine"],
		prepareInstallFromSystem: (async () => ({
			systemTemplateId,
			name: "W-9",
			catalogVersionLabel: "irs-2024",
			systemContentFingerprint: fingerprintV1,
			snapshotJson: baseSnapshot,
			documents: [
				{
					docId: "doc-1",
					name: "w9.pdf",
					size: 10,
					mimeType: "application/pdf",
					plaintextSha256: `0x${"11".repeat(32)}`,
					downloadUrl: "https://example.test/doc-1.pdf",
				},
				{
					docId: "doc-2",
					name: "addendum.pdf",
					size: 12,
					mimeType: "application/pdf",
					plaintextSha256: `0x${"22".repeat(32)}`,
					downloadUrl: "https://example.test/doc-2.pdf",
				},
			],
		})) as InstallCatalogTemplateDeps["prepareInstallFromSystem"],
	};
}

describe("installCatalogTemplate", () => {
	test("merges catalogSource and downloads all documents before create", async () => {
		const fetchCalls: string[] = [];
		const puts: string[] = [];
		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (
			input: RequestInfo | URL,
			init?: RequestInit,
		) => {
			const url = String(input);
			if (init?.method === "PUT") {
				puts.push(url);
			} else {
				fetchCalls.push(url);
			}
			return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
		}) as typeof fetch;

		try {
			const { publicKey: omkPublic } = await KEM.keyGen({
				seed: randomBytes(64),
			});

			let createPayload: Record<string, unknown> | undefined;
			const deps = mockInstallDeps({
				prepared: [
					{
						docId: "doc-1",
						s3Key: "orgs/org/templates/t/doc-1.bin",
						needsUpload: true,
						uploadUrl: "https://example.test/upload/doc-1",
					},
					{
						docId: "doc-2",
						s3Key: "orgs/org/templates/t/doc-2.bin",
						needsUpload: true,
						uploadUrl: "https://example.test/upload/doc-2",
					},
				],
				create: (async (body: unknown) => {
					createPayload = body as Record<string, unknown>;
					return { template: { id: templateId } };
				}) as InstallCatalogTemplateDeps["create"],
			});

			await installCatalogTemplate(deps, {
				systemTemplateId,
				templateId,
				organizationId,
				orgEncryptionPublicKey: toHex(omkPublic),
				name: "W-9",
			});

			expect(fetchCalls).toEqual([
				"https://example.test/doc-1.pdf",
				"https://example.test/doc-2.pdf",
			]);
			expect(puts).toEqual([
				"https://example.test/upload/doc-1",
				"https://example.test/upload/doc-2",
			]);

			const snapshot = createPayload?.snapshot as {
				catalogSource?: {
					systemTemplateId: string;
					systemContentFingerprint: string;
					catalogVersionLabel: string;
					installedAtIso: string;
				};
			};
			expect(snapshot.catalogSource?.systemTemplateId).toBe(systemTemplateId);
			expect(snapshot.catalogSource?.systemContentFingerprint).toBe(
				fingerprintV1,
			);
			expect(snapshot.catalogSource?.catalogVersionLabel).toBe("irs-2024");
			expect(snapshot.catalogSource?.installedAtIso).toEqual(
				expect.any(String),
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test("throws when catalog document download fails", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (
			input: RequestInfo | URL,
			init?: RequestInit,
		) => {
			void input;
			void init;
			return new Response(null, { status: 500 });
		}) as typeof fetch;

		try {
			const { publicKey: omkPublic } = await KEM.keyGen({
				seed: randomBytes(64),
			});

			const deps = mockInstallDeps({
				prepared: [],
				create: (async (body: unknown) => {
					void body;
					return { template: { id: templateId } };
				}) as InstallCatalogTemplateDeps["create"],
			});

			await expect(
				installCatalogTemplate(deps, {
					systemTemplateId,
					templateId,
					organizationId,
					orgEncryptionPublicKey: toHex(omkPublic),
					name: "W-9",
				}),
			).rejects.toThrow("Failed to download catalog template document");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
