import { describe, expect, test } from "bun:test";
import {
	buildCatalogSourceForInstall,
	canonicalSystemTemplateSnapshotForFingerprint,
	catalogVersionLabelFromMeta,
	computeSystemTemplateContentFingerprint,
} from "../utils/system-template";
import type { TemplateSnapshot } from "../utils/template";

const baseSnapshot: TemplateSnapshot = {
	version: 1,
	roles: [
		{
			roleId: "signer:alice@template.filosign",
			label: "Signer 1",
			kind: "signer",
			order: 0,
		},
	],
	fields: [
		{
			id: "field-1",
			documentId: "doc-1",
			pageIndex: 0,
			rect: { x: 0.1, y: 0.2, width: 0.3, height: 0.04 },
			roleId: "signer:alice@template.filosign",
			required: true,
			type: "signature",
		},
	],
};

describe("catalogVersionLabelFromMeta", () => {
	test("returns trimmed documentVersion", () => {
		expect(
			catalogVersionLabelFromMeta({
				category: "tax",
				tags: [],
				documentVersion: "  irs-2024  ",
				sortOrder: 0,
			}),
		).toBe("irs-2024");
	});
});

describe("buildCatalogSourceForInstall", () => {
	test("parses catalog source and sets installedAtIso when omitted", () => {
		const source = buildCatalogSourceForInstall({
			systemTemplateId: "00000000-0000-7000-8000-000000000001",
			systemContentFingerprint: `0x${"aa".repeat(32)}`,
			catalogVersionLabel: "irs-2024",
			installedAtIso: "2024-01-01T00:00:00.000Z",
		});
		expect(source.systemTemplateId).toBe(
			"00000000-0000-7000-8000-000000000001",
		);
		expect(source.catalogVersionLabel).toBe("irs-2024");
		expect(source.installedAtIso).toBe("2024-01-01T00:00:00.000Z");
	});

	test("defaults installedAtIso to an ISO timestamp", () => {
		const source = buildCatalogSourceForInstall({
			systemTemplateId: "00000000-0000-7000-8000-000000000001",
			systemContentFingerprint: `0x${"aa".repeat(32)}`,
			catalogVersionLabel: "irs-2024",
		});
		expect(() => new Date(source.installedAtIso)).not.toThrow();
	});
});

describe("canonicalSystemTemplateSnapshotForFingerprint", () => {
	test("strips catalogSource and normalizes field order", () => {
		const withCatalogSource: TemplateSnapshot = {
			...baseSnapshot,
			catalogSource: {
				systemTemplateId: "00000000-0000-7000-8000-000000000001",
				installedAtIso: "2024-01-01T00:00:00.000Z",
				systemContentFingerprint: `0x${"aa".repeat(32)}`,
				catalogVersionLabel: "irs-2024",
			},
		};
		const reversed = {
			...withCatalogSource,
			fields: [...withCatalogSource.fields].reverse(),
		};
		expect(
			canonicalSystemTemplateSnapshotForFingerprint(withCatalogSource),
		).toBe(canonicalSystemTemplateSnapshotForFingerprint(reversed));
		expect(
			canonicalSystemTemplateSnapshotForFingerprint(withCatalogSource),
		).not.toContain("catalogSource");
	});
});

describe("computeSystemTemplateContentFingerprint", () => {
	test("is stable regardless of field array order", () => {
		const reversed = {
			...baseSnapshot,
			fields: [...baseSnapshot.fields].reverse(),
		};
		const fingerprintA = computeSystemTemplateContentFingerprint({
			snapshot: baseSnapshot,
			documents: [{ docId: "doc-1", plaintextSha256: `0x${"ab".repeat(32)}` }],
		});
		const fingerprintB = computeSystemTemplateContentFingerprint({
			snapshot: reversed,
			documents: [{ docId: "doc-1", plaintextSha256: `0x${"ab".repeat(32)}` }],
		});
		expect(fingerprintA).toBe(fingerprintB);
	});

	test("changes when document hash changes", () => {
		const first = computeSystemTemplateContentFingerprint({
			snapshot: baseSnapshot,
			documents: [{ docId: "doc-1", plaintextSha256: `0x${"ab".repeat(32)}` }],
		});
		const second = computeSystemTemplateContentFingerprint({
			snapshot: baseSnapshot,
			documents: [{ docId: "doc-1", plaintextSha256: `0x${"cd".repeat(32)}` }],
		});
		expect(first).not.toBe(second);
	});

	test("is stable regardless of document array order", () => {
		const digestA = `0x${"ab".repeat(32)}` as `0x${string}`;
		const digestB = `0x${"cd".repeat(32)}` as `0x${string}`;
		const first = computeSystemTemplateContentFingerprint({
			snapshot: baseSnapshot,
			documents: [
				{ docId: "doc-b", plaintextSha256: digestB },
				{ docId: "doc-a", plaintextSha256: digestA },
			],
		});
		const second = computeSystemTemplateContentFingerprint({
			snapshot: baseSnapshot,
			documents: [
				{ docId: "doc-a", plaintextSha256: digestA },
				{ docId: "doc-b", plaintextSha256: digestB },
			],
		});
		expect(first).toBe(second);
	});
});
