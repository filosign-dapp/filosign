import { describe, expect, mock, test } from "bun:test";
import { ORPCError } from "@orpc/server";
import {
	readCatalogListFieldsFromSnapshot,
	resolveCatalogUpdateForOrgTemplate,
} from "@/lib/domains/catalog/utils/org-template-catalog-update";
import {
	readInstalledCatalogFingerprint,
	resolveAlreadyInstalledInWorkspace,
	resolveNewerVersionAvailable,
} from "@/lib/domains/catalog/utils/version-hints";

const systemTemplateId = "00000000-0000-7000-8000-000000000001";
const organizationId = "00000000-0000-7000-8000-000000000002";
const fingerprintV1 = `0x${"aa".repeat(32)}`;
const fingerprintV2 = `0x${"bb".repeat(32)}`;

async function expectAppError(
	fn: () => Promise<unknown>,
	code: string,
): Promise<void> {
	try {
		await fn();
		throw new Error("expected throw");
	} catch (error) {
		expect(error).toBeInstanceOf(ORPCError);
		const data = (error as { data?: { appCode?: string } }).data;
		expect(data?.appCode).toBe(code);
	}
}

function catalogSource(fingerprint: string) {
	return {
		systemTemplateId,
		installedAtIso: "2024-01-01T00:00:00.000Z",
		systemContentFingerprint: fingerprint,
		catalogVersionLabel: "irs-2024",
	};
}

function mockInstalledFingerprints(rows: Array<{ snapshotJson: unknown }>) {
	mock.module("@/lib/platform/db", () => ({
		default: {
			schema: {
				organizationTemplates: {
					snapshotJson: "snapshotJson",
					organizationId: "organizationId",
				},
			},
			select: () => ({
				from: () => ({
					where: async () => rows,
				}),
			}),
		},
	}));
}

function mockPublishedTemplate(contentFingerprint: string) {
	const catalogVersionLabel =
		contentFingerprint === fingerprintV2 ? "irs-2025" : "irs-2024";
	mock.module("@/lib/domains/platform/system-templates", () => ({
		getPublishedSystemTemplate: async () => ({
			id: systemTemplateId,
			contentFingerprint,
			catalogVersionLabel,
		}),
		getPublishedSystemTemplateWithDocuments: async () => ({
			template: { id: systemTemplateId, contentFingerprint },
			documents: [],
		}),
		getPublishedSystemTemplateForInstall: async () => ({
			template: { id: systemTemplateId, contentFingerprint },
			documents: [],
		}),
		listPublishedSystemTemplates: async () => [],
	}));
}

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

function snapshotWithCatalogSource(fingerprint: string) {
	return {
		...baseSnapshot,
		catalogSource: {
			systemTemplateId,
			installedAtIso: "2024-01-01T00:00:00.000Z",
			systemContentFingerprint: fingerprint,
			catalogVersionLabel: "irs-2024",
		},
	};
}

describe("readInstalledCatalogFingerprint", () => {
	test("returns null when catalogSource is missing", () => {
		expect(readInstalledCatalogFingerprint(baseSnapshot)).toBeNull();
	});

	test("reads installed catalog provenance", () => {
		expect(
			readInstalledCatalogFingerprint(snapshotWithCatalogSource(fingerprintV1)),
		).toEqual({
			systemTemplateId,
			systemContentFingerprint: fingerprintV1,
			catalogVersionLabel: "irs-2024",
		});
	});
});

describe("resolveNewerVersionAvailable", () => {
	test("returns false when nothing is installed", () => {
		expect(
			resolveNewerVersionAvailable({
				systemTemplateId,
				contentFingerprint: fingerprintV2,
				installed: [],
			}),
		).toBe(false);
	});

	test("returns false when installed fingerprint matches published", () => {
		expect(
			resolveNewerVersionAvailable({
				systemTemplateId,
				contentFingerprint: fingerprintV1,
				installed: [
					{
						systemTemplateId,
						systemContentFingerprint: fingerprintV1,
						catalogVersionLabel: "irs-2024",
					},
				],
			}),
		).toBe(false);
	});

	test("returns true when any installed copy is older", () => {
		expect(
			resolveNewerVersionAvailable({
				systemTemplateId,
				contentFingerprint: fingerprintV2,
				installed: [
					{
						systemTemplateId,
						systemContentFingerprint: fingerprintV1,
						catalogVersionLabel: "irs-2024",
					},
					{
						systemTemplateId,
						systemContentFingerprint: fingerprintV2,
						catalogVersionLabel: "irs-2025",
					},
				],
			}),
		).toBe(true);
	});
});

describe("resolveAlreadyInstalledInWorkspace", () => {
	test("returns false when nothing is installed", () => {
		expect(
			resolveAlreadyInstalledInWorkspace({
				systemTemplateId,
				contentFingerprint: fingerprintV1,
				installed: [],
			}),
		).toBe(false);
	});

	test("returns true when the same catalog version is installed", () => {
		expect(
			resolveAlreadyInstalledInWorkspace({
				systemTemplateId,
				contentFingerprint: fingerprintV1,
				installed: [
					{
						systemTemplateId,
						systemContentFingerprint: fingerprintV1,
						catalogVersionLabel: "irs-2024",
					},
				],
			}),
		).toBe(true);
	});

	test("returns false when only an older catalog version is installed", () => {
		expect(
			resolveAlreadyInstalledInWorkspace({
				systemTemplateId,
				contentFingerprint: fingerprintV2,
				installed: [
					{
						systemTemplateId,
						systemContentFingerprint: fingerprintV1,
						catalogVersionLabel: "irs-2024",
					},
				],
			}),
		).toBe(false);
	});
});

describe("readCatalogListFieldsFromSnapshot", () => {
	test("returns catalog fields from snapshot provenance", () => {
		expect(
			readCatalogListFieldsFromSnapshot(
				snapshotWithCatalogSource(fingerprintV1),
			),
		).toEqual({
			catalogVersionLabel: "irs-2024",
			catalogSystemTemplateId: systemTemplateId,
		});
	});

	test("returns empty object without catalogSource", () => {
		expect(readCatalogListFieldsFromSnapshot(baseSnapshot)).toEqual({});
	});
});

describe("resolveCatalogUpdateForOrgTemplate", () => {
	test("reports newer catalog version when published fingerprint differs", async () => {
		mockPublishedTemplate(fingerprintV2);

		await expect(
			resolveCatalogUpdateForOrgTemplate(
				snapshotWithCatalogSource(fingerprintV1),
			),
		).resolves.toEqual({
			newerVersionAvailable: true,
			installedCatalogVersionLabel: "irs-2024",
			currentCatalogVersionLabel: "irs-2025",
			systemTemplateId,
		});

		mock.restore();
	});

	test("reports no update when fingerprints match", async () => {
		mockPublishedTemplate(fingerprintV1);

		await expect(
			resolveCatalogUpdateForOrgTemplate(
				snapshotWithCatalogSource(fingerprintV1),
			),
		).resolves.toEqual({
			newerVersionAvailable: false,
			installedCatalogVersionLabel: "irs-2024",
			systemTemplateId,
		});

		mock.restore();
	});
});

describe("assertCatalogSourceOnOrgTemplateCreate", () => {
	test("rejects stale catalog fingerprint", async () => {
		mockPublishedTemplate(fingerprintV2);
		mockInstalledFingerprints([]);

		const { assertCatalogSourceOnOrgTemplateCreate } = await import(
			"@/lib/domains/catalog"
		);

		await expectAppError(
			() =>
				assertCatalogSourceOnOrgTemplateCreate({
					organizationId,
					catalogSource: catalogSource(fingerprintV1),
				}),
			"WORKSPACE.CATALOG_INSTALL_STALE",
		);

		mock.restore();
	});

	test("rejects duplicate catalog version", async () => {
		mockPublishedTemplate(fingerprintV1);
		mockInstalledFingerprints([
			{
				snapshotJson: snapshotWithCatalogSource(fingerprintV1),
			},
		]);

		const { assertCatalogSourceOnOrgTemplateCreate } = await import(
			"@/lib/domains/catalog"
		);

		await expectAppError(
			() =>
				assertCatalogSourceOnOrgTemplateCreate({
					organizationId,
					catalogSource: catalogSource(fingerprintV1),
				}),
			"WORKSPACE.CATALOG_VERSION_ALREADY_INSTALLED",
		);

		mock.restore();
	});

	test("allows new catalog install", async () => {
		mockPublishedTemplate(fingerprintV1);
		mockInstalledFingerprints([]);

		const { assertCatalogSourceOnOrgTemplateCreate } = await import(
			"@/lib/domains/catalog"
		);

		await expect(
			assertCatalogSourceOnOrgTemplateCreate({
				organizationId,
				catalogSource: catalogSource(fingerprintV1),
			}),
		).resolves.toBeUndefined();

		mock.restore();
	});
});

describe("assertCatalogTemplateInstallable", () => {
	test("rejects when catalog version is already installed", async () => {
		mockPublishedTemplate(fingerprintV1);
		mockInstalledFingerprints([
			{
				snapshotJson: snapshotWithCatalogSource(fingerprintV1),
			},
		]);

		const { assertCatalogTemplateInstallable } = await import(
			"@/lib/domains/catalog"
		);

		await expectAppError(
			() =>
				assertCatalogTemplateInstallable({
					organizationId,
					systemTemplateId,
				}),
			"WORKSPACE.CATALOG_VERSION_ALREADY_INSTALLED",
		);

		mock.restore();
	});
});
