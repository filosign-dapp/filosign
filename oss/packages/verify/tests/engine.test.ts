import { describe, expect, it } from "bun:test";
import {
	type ComplianceBundle,
	canonicalComplianceBundleJson,
	complianceBundleSha256Hex,
	computePlacementCommitment,
	sha256PlaintextHex,
	zComplianceBundle,
} from "@filosign/protocol";
import { verifyLocal } from "../src/index";

const placementManifest = {
	version: 1 as const,
	documents: [
		{
			id: "d1",
			name: "a.pdf",
			sha256Plaintext: `0x${"aa".repeat(32)}`,
			pageCount: 1,
		},
	],
	fields: [
		{
			id: "f1",
			documentId: "d1",
			pageIndex: 0,
			rect: { x: 0, y: 0, width: 0.1, height: 0.1 },
			assignedRecipientEmail: "a@example.com",
			required: true,
			type: "signature" as const,
		},
	],
};

const minimalBundle = {
	version: 1,
	pieceCid: "bafyTEST",
	chainId: 84532,
	exportedAtIso: "2026-01-01T00:00:00.000Z",
	executionStatus: "fully_executed",
	satelliteWorkflowStatus: "none",
	placementCommitment: computePlacementCommitment(placementManifest),
	placementManifest,
	registration: {
		sender: "0x0000000000000000000000000000000000000001",
		registrationTxHash: `0x${"bb".repeat(32)}`,
		createdAtIso: "2026-01-01T00:00:00.000Z",
		registerDocumentSha256: `0x${"cc".repeat(32)}`,
	},
	parties: [],
	onchainRegistration: null,
	transactions: [],
	signers: [],
	settlements: [],
	attachments: [],
	offChainEvidence: {
		acknowledgements: [],
		documentViews: [],
		coldInviteClaims: [],
		payoutRecipientAcknowledgements: [],
	},
} satisfies ComplianceBundle;

function sortKeysDeep(value: unknown): unknown {
	if (value === null || typeof value !== "object") {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(sortKeysDeep);
	}
	const obj = value as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(obj).sort()) {
		sorted[key] = sortKeysDeep(obj[key]);
	}
	return sorted;
}

/** Pre-previewUrl-strip export canonicalization (legacy production packets). */
function legacyCanonicalComplianceBundleJson(bundle: ComplianceBundle): string {
	return JSON.stringify(sortKeysDeep(bundle));
}

function encodeBundleJson(bundle: ComplianceBundle): Uint8Array {
	return new TextEncoder().encode(canonicalComplianceBundleJson(bundle));
}

describe("@filosign/verify local checks", () => {
	it("verifyLocal passes schema and placement checks on minimal bundle", async () => {
		const summary = await verifyLocal({ bundle: minimalBundle });
		expect(summary.failed).toBe(0);
		expect(summary.passed).toBeGreaterThan(0);
		expect(
			summary.results.some((result) => result.id === "local.bundle.schema"),
		).toBe(true);
	});

	it("verifyLocal compares bundle.sha256 sidecar when provided", async () => {
		const bundleJsonBytes = encodeBundleJson(minimalBundle);
		const bundleHash = await sha256PlaintextHex(bundleJsonBytes);
		const summary = await verifyLocal({
			bundle: minimalBundle,
			bundleJsonBytes,
			bundleSha256Sidecar: bundleHash,
		});
		expect(summary.failed).toBe(0);
		expect(
			summary.results.find(
				(result) => result.id === "local.bundle.sha256.sidecar",
			)?.status,
		).toBe("pass");
		expect(
			summary.results.find(
				(result) => result.id === "local.bundle.sha256.canonical",
			)?.status,
		).toBe("pass");
	});

	it("verifyLocal fails when bundle.sha256 sidecar mismatches", async () => {
		const bundleJsonBytes = encodeBundleJson(minimalBundle);
		const summary = await verifyLocal({
			bundle: minimalBundle,
			bundleJsonBytes,
			bundleSha256Sidecar: `0x${"ff".repeat(32)}`,
		});
		expect(summary.failed).toBeGreaterThan(0);
		expect(
			summary.results.find(
				(result) => result.id === "local.bundle.sha256.sidecar",
			)?.status,
		).toBe("fail");
		expect(
			summary.results.find(
				(result) => result.id === "local.bundle.sha256.sidecar",
			)?.message,
		).toBe("bundle.sha256 does not match bundle.json bytes in packet");
	});

	it("canonical JSON parse round-trip matches sidecar hash", async () => {
		const bundleHash = await complianceBundleSha256Hex(minimalBundle);
		const canonical = canonicalComplianceBundleJson(minimalBundle);
		const bundleJsonBytes = new TextEncoder().encode(canonical);
		const reparsed = zComplianceBundle.parse(JSON.parse(canonical));
		const recomputed = await complianceBundleSha256Hex(reparsed);
		expect(recomputed).toBe(bundleHash);

		const summary = await verifyLocal({
			bundle: reparsed,
			bundleJsonBytes,
			bundleSha256Sidecar: bundleHash,
		});
		expect(
			summary.results.find(
				(result) => result.id === "local.bundle.sha256.sidecar",
			)?.status,
		).toBe("pass");
	});

	it("canonical hash ignores ephemeral fieldCompletions previewUrl", async () => {
		const withPreview = zComplianceBundle.parse({
			...minimalBundle,
			fieldCompletions: [
				{
					fieldId: "f1",
					valueKind: "visual",
					sourceArtifactId: "00000000-0000-4000-8000-000000000001",
					storageKey: "signatures/artifact-1",
					contentSha256: `${"dd".repeat(32)}`,
					textValue: null,
					previewUrl: "https://cdn.example.com/presigned?expires=1",
					signer: "0x0000000000000000000000000000000000000001",
				},
			],
		});
		const withoutPreview = zComplianceBundle.parse({
			...minimalBundle,
			fieldCompletions: [
				{
					fieldId: "f1",
					valueKind: "visual",
					sourceArtifactId: "00000000-0000-4000-8000-000000000001",
					storageKey: "signatures/artifact-1",
					contentSha256: `${"dd".repeat(32)}`,
					textValue: null,
					previewUrl: null,
					signer: "0x0000000000000000000000000000000000000001",
				},
			],
		});

		const hashWith = await complianceBundleSha256Hex(withPreview);
		const hashWithout = await complianceBundleSha256Hex(withoutPreview);
		expect(hashWith).toBe(hashWithout);

		const canonical = canonicalComplianceBundleJson(withPreview);
		const reparsed = zComplianceBundle.parse(JSON.parse(canonical));
		expect(reparsed.fieldCompletions?.[0]?.previewUrl).toBeNull();
		expect(await complianceBundleSha256Hex(reparsed)).toBe(hashWith);
	});

	it("legacy bundle.json bytes with previewUrl pass sidecar but warn on canonical recompute", async () => {
		const withPreview = zComplianceBundle.parse({
			...minimalBundle,
			fieldCompletions: [
				{
					fieldId: "f1",
					valueKind: "visual",
					sourceArtifactId: "00000000-0000-4000-8000-000000000001",
					storageKey: "signatures/artifact-1",
					contentSha256: `${"dd".repeat(32)}`,
					textValue: null,
					previewUrl: "https://cdn.example.com/presigned?expires=1",
					signer: "0x0000000000000000000000000000000000000001",
				},
			],
		});

		const legacyJson = legacyCanonicalComplianceBundleJson(withPreview);
		const bundleJsonBytes = new TextEncoder().encode(legacyJson);
		const legacyHash = await sha256PlaintextHex(bundleJsonBytes);
		const modernHash = await complianceBundleSha256Hex(withPreview);
		expect(legacyHash).not.toBe(modernHash);
		expect(legacyJson).toContain("https://cdn.example.com/presigned?expires=1");

		const parsed = zComplianceBundle.parse(JSON.parse(legacyJson));
		const summary = await verifyLocal({
			bundle: parsed,
			bundleJsonBytes,
			bundleSha256Sidecar: legacyHash,
		});

		expect(
			summary.results.find(
				(result) => result.id === "local.bundle.sha256.sidecar",
			)?.status,
		).toBe("pass");
		expect(
			summary.results.find(
				(result) => result.id === "local.bundle.sha256.canonical",
			)?.status,
		).toBe("warn");
		expect(summary.failed).toBe(0);
		expect(summary.warned).toBeGreaterThan(0);
	});

	it("canonical bundle.json bytes pass both sidecar and canonical checks", async () => {
		const withPreview = zComplianceBundle.parse({
			...minimalBundle,
			fieldCompletions: [
				{
					fieldId: "f1",
					valueKind: "visual",
					sourceArtifactId: "00000000-0000-4000-8000-000000000001",
					storageKey: "signatures/artifact-1",
					contentSha256: `${"dd".repeat(32)}`,
					textValue: null,
					previewUrl: "https://cdn.example.com/presigned?expires=1",
					signer: "0x0000000000000000000000000000000000000001",
				},
			],
		});

		const canonicalJson = canonicalComplianceBundleJson(withPreview);
		const bundleJsonBytes = new TextEncoder().encode(canonicalJson);
		const bundleHash = await sha256PlaintextHex(bundleJsonBytes);
		const parsed = zComplianceBundle.parse(JSON.parse(canonicalJson));

		const summary = await verifyLocal({
			bundle: parsed,
			bundleJsonBytes,
			bundleSha256Sidecar: bundleHash,
		});

		expect(
			summary.results.find(
				(result) => result.id === "local.bundle.sha256.sidecar",
			)?.status,
		).toBe("pass");
		expect(
			summary.results.find(
				(result) => result.id === "local.bundle.sha256.canonical",
			)?.status,
		).toBe("pass");
		expect(summary.failed).toBe(0);
	});
});
