import { afterAll, describe, expect, mock, test } from "bun:test";
import type { ComplianceBundle } from "@filosign/shared";
import {
	canonicalComplianceBundleJson,
	zComplianceBundle,
} from "@filosign/shared";
import { sha256HexUtf8 } from "@/lib/platform/compliance/hash";

const bundleFixture = zComplianceBundle.parse({
	version: 1,
	pieceCid: "bafyPIPELINE",
	chainId: 84532,
	exportedAtIso: "2026-01-01T00:00:00.000Z",
	executionStatus: "fully_executed",
	satelliteWorkflowStatus: "none",
	placementCommitment: `0x${"01".repeat(32)}`,
	placementManifest: {
		version: 1,
		documents: [
			{
				id: "doc1",
				name: "contract.pdf",
				sha256Plaintext: `0x${"ab".repeat(32)}`,
				pageCount: 1,
			},
		],
		fields: [
			{
				id: "f1",
				documentId: "doc1",
				pageIndex: 0,
				rect: { x: 0, y: 0, width: 0.1, height: 0.1 },
				assignedRecipientEmail: "signer@example.com",
				required: true,
				type: "signature",
			},
		],
	},
	registration: {
		sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
		registrationTxHash: `0x${"02".repeat(32)}`,
		createdAtIso: "2026-01-01T00:00:00.000Z",
		registerDocumentSha256: `0x${"12".repeat(32)}`,
	},
	parties: [
		{
			role: "sender",
			wallet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
			email: "sender@example.com",
			displayName: "Sender",
			emailCommitment: `0x${"03".repeat(32)}`,
			authSubjectCommitment: `0x${"04".repeat(32)}`,
		},
	],
	onchainRegistration: null,
	transactions: [
		{
			kind: "file_registered",
			txHash: `0x${"02".repeat(32)}`,
			chainId: 84532,
			contractAddress: "0x0000000000000000000000000000000000000abc",
			summary: "test",
			relatedAddresses: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
			blockNumber: null,
			timestamp: null,
			fetchedAtIso: null,
		},
	],
	signers: [
		{
			wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			displayName: "Signer",
			email: "signer@example.com",
			signed: true,
			assignedFieldIds: ["f1"],
			requiredFieldIds: ["f1"],
			optionalFieldIds: [],
			onchainTxHash: `0x${"05".repeat(32)}`,
			signedAtIso: "2026-01-01T00:00:00.000Z",
			messageTimestampIso: "2026-01-01T00:00:00.000Z",
			blockTimestampFromTx: null,
			acknowledgedAtIso: "2026-01-01T00:00:00.000Z",
			firstViewedAtIso: "2026-01-01T00:00:01.000Z",
			completedFieldIds: ["f1"],
			completionsRoot: `0x${"06".repeat(32)}`,
			leafSchemaVersion: 1,
			merkleProofs: [
				{
					fieldId: "f1",
					leafHash: `0x${"07".repeat(32)}`,
					leafIndex: 0,
					siblings: [],
				},
			],
			draftCompletedFieldIds: [],
		},
	],
	settlements: [],
	attachments: [],
	offChainEvidence: {
		acknowledgements: [],
		documentViews: [],
		coldInviteClaims: [],
		payoutRecipientAcknowledgements: [],
	},
}) as ComplianceBundle;

const bundleHash = sha256HexUtf8(canonicalComplianceBundleJson(bundleFixture));

let writtenKey: string | null = null;

mock.module("@/lib/platform/s3/client", () => ({
	bucket: {
		write: async (key: string) => {
			writtenKey = key;
		},
	},
}));

mock.module("@/lib/platform/db", () => ({
	default: {
		insert: () => ({
			values: () => ({
				returning: () => Promise.resolve([{ id: "export-id-1" }]),
			}),
		}),
	},
}));

afterAll(() => {
	mock.restore();
});

describe("insertComplianceExportLog", () => {
	test("rejects bundle hash mismatch before writing", async () => {
		const { insertComplianceExportLog } = await import(
			"@/lib/platform/compliance/export-log"
		);
		const db = (await import("@/lib/platform/db")).default;
		writtenKey = null;

		await expect(
			insertComplianceExportLog({
				db,
				pieceCid: bundleFixture.pieceCid,
				requestedBy: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
				bundle: bundleFixture,
				bundleHash: `0x${"ff".repeat(32)}`,
				exportKind: "pdf",
			}),
		).rejects.toThrow(/hash mismatch/);

		expect(writtenKey).toBeNull();
	});

	test("persists when bundle hash matches canonical JSON", async () => {
		const { insertComplianceExportLog } = await import(
			"@/lib/platform/compliance/export-log"
		);
		const db = (await import("@/lib/platform/db")).default;
		writtenKey = null;

		const result = await insertComplianceExportLog({
			db,
			pieceCid: bundleFixture.pieceCid,
			requestedBy: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
			bundle: bundleFixture,
			bundleHash,
			exportKind: "zip",
			documentSha256: bundleFixture.registration.registerDocumentSha256,
		});

		expect(result.exportId).toBe("export-id-1");
		expect(writtenKey).toMatch(/^compliance-exports\//);
	});
});

describe("compliance bundle canonical export bytes", () => {
	test("bundleCanonicalJson hashes to bundleHash", () => {
		const canonical = canonicalComplianceBundleJson(bundleFixture);
		expect(sha256HexUtf8(canonical)).toBe(bundleHash);
	});

	test("bundleCanonicalJson omits ephemeral fieldCompletions previewUrl", () => {
		const fieldCompletion = {
			fieldId: "f1",
			valueKind: "visual" as const,
			sourceArtifactId: "00000000-0000-4000-8000-000000000001",
			storageKey: "signatures/artifact-1",
			contentSha256: `${"ab".repeat(32)}`,
			textValue: null,
			previewUrl: "https://cdn.example.com/presigned?expires=1",
			signer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
		};
		const withPreview = zComplianceBundle.parse({
			...bundleFixture,
			fieldCompletions: [fieldCompletion],
		});
		const withoutPreview = zComplianceBundle.parse({
			...bundleFixture,
			fieldCompletions: [{ ...fieldCompletion, previewUrl: null }],
		});
		const canonical = canonicalComplianceBundleJson(withPreview);
		const parsed = JSON.parse(canonical) as {
			fieldCompletions: Array<{ previewUrl: string | null }>;
		};
		expect(parsed.fieldCompletions[0]?.previewUrl).toBeNull();
		expect(sha256HexUtf8(canonical)).toBe(
			sha256HexUtf8(canonicalComplianceBundleJson(withoutPreview)),
		);
	});
});

describe("insertComplianceExportLog pending satellite", () => {
	test("parses bundle with pending satellite workflows", () => {
		const pending = zComplianceBundle.parse({
			...bundleFixture,
			satelliteWorkflowStatus: "pending",
			pendingSatelliteSummary: { payouts: 1, attachments: 0 },
			settlements: [
				{
					onChainRuleId: "1",
					legs: [
						{
							recipientWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
							amount: "1000000",
						},
					],
					tokenAddress: "0x0000000000000000000000000000000000000abc",
					validatorAddress: "0x0000000000000000000000000000000000000abc",
					releaseType: "all_signed",
					status: "ready",
					registerRuleTxHash: `0x${"08".repeat(32)}`,
					approveTxHash: `0x${"09".repeat(32)}`,
					payoutTxHash: null,
					executedAtIso: null,
					lastError: null,
				},
			],
		});
		expect(pending.satelliteWorkflowStatus).toBe("pending");
		expect(pending.pendingSatelliteSummary).toEqual({
			payouts: 1,
			attachments: 0,
		});
	});
});
