import { describe, expect, test } from "bun:test";
import type { ComplianceBundle } from "@filosign/shared";
import {
	canonicalComplianceBundleJson,
	sha256PlaintextHex,
	zComplianceBundle,
} from "@filosign/shared";
import { resolveSatelliteWorkflowSummary } from "@/src/lib/domains/files/compliance-pdf/proof-export-state";
import { buildProofPacketBundleBytes } from "@/src/lib/domains/files/compliance-pdf/utils/bundle-integrity";

const hex32 = (byte: string) => `0x${byte.repeat(32)}` as `0x${string}`;

const bundleWithPreviewUrl = {
	version: 1,
	pieceCid: "bafyTEST",
	chainId: 8453,
	exportedAtIso: "2026-01-01T00:00:00.000Z",
	executionStatus: "fully_executed",
	satelliteWorkflowStatus: "none",
	placementCommitment: hex32("11"),
	placementManifest: {
		version: 1,
		documents: [
			{
				id: "doc1",
				name: "contract.pdf",
				sha256Plaintext: hex32("22"),
				pageCount: 1,
			},
		],
		fields: [
			{
				id: "field1",
				documentId: "doc1",
				pageIndex: 0,
				rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
				assignedRecipientEmail: "signer@example.com",
				required: true,
				type: "signature",
			},
		],
	},
	registration: {
		sender: "0x0000000000000000000000000000000000000001",
		registrationTxHash: hex32("33"),
		createdAtIso: "2026-01-01T00:00:00.000Z",
		registerDocumentSha256: hex32("44"),
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
	fieldCompletions: [
		{
			fieldId: "field1",
			valueKind: "visual",
			sourceArtifactId: "00000000-0000-4000-8000-000000000001",
			storageKey: "signatures/artifact-1",
			contentSha256: "ab".repeat(32),
			textValue: null,
			previewUrl: "https://cdn.example.com/presigned?expires=1",
			signer: "0x0000000000000000000000000000000000000002",
		},
	],
} satisfies ComplianceBundle;

describe("resolveSatelliteWorkflowSummary", () => {
	test("uses live settlement state for recipients without conditional packet list", () => {
		const summary = resolveSatelliteWorkflowSummary({
			settlementRules: [{ status: "ready" }],
			serverSummary: {
				hasSatellites: true,
				hasPending: false,
				allTerminal: true,
				pendingPayoutCount: 0,
				pendingAttachmentCount: 0,
			},
		});
		expect(summary.pendingPayoutCount).toBe(1);
		expect(summary.allTerminal).toBe(false);
	});
});

describe("buildProofPacketBundleBytes", () => {
	test("hashes the exact canonical bytes written to proof packet bundle.json", async () => {
		const withoutPreview = {
			...bundleWithPreviewUrl,
			fieldCompletions: [
				{
					...bundleWithPreviewUrl.fieldCompletions[0],
					previewUrl: null,
				},
			],
		} satisfies ComplianceBundle;
		const canonicalBytes = new TextEncoder().encode(
			canonicalComplianceBundleJson(withoutPreview),
		);
		const expectedHash = await sha256PlaintextHex(canonicalBytes);

		const packetBundle = await buildProofPacketBundleBytes({
			bundle: bundleWithPreviewUrl,
			expectedHash,
		});
		const parsed = zComplianceBundle.parse(
			JSON.parse(packetBundle.canonicalJson),
		);

		expect(packetBundle.sha256).toBe(expectedHash);
		expect(await sha256PlaintextHex(packetBundle.bytes)).toBe(expectedHash);
		expect(parsed.fieldCompletions?.[0]?.previewUrl).toBeNull();
		expect(packetBundle.canonicalJson).not.toContain("presigned?expires=1");
	});

	test("rejects packets before download when exact bundle bytes drift", async () => {
		await expect(
			buildProofPacketBundleBytes({
				bundle: bundleWithPreviewUrl,
				expectedHash: hex32("ff"),
			}),
		).rejects.toThrow("canonical bundle bytes do not match bundle hash");
	});
});
