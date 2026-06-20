import { describe, expect, it } from "bun:test";
import {
	canonicalComplianceBundleJson as sharedCanonical,
	zComplianceBundle as zSharedComplianceBundle,
} from "@filosign/shared";
import {
	canonicalComplianceBundleJson as protocolCanonical,
	complianceBundleSha256Hex,
	zComplianceBundle as zProtocolComplianceBundle,
} from "../src/index";

const minimalManifest = {
	version: 1 as const,
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
			type: "signature" as const,
		},
	],
};

function minimalBundleRaw(extra?: Record<string, unknown>) {
	return {
		version: 1 as const,
		pieceCid: "bafyTEST",
		chainId: 84532,
		exportedAtIso: "2026-01-01T00:00:00.000Z",
		executionStatus: "fully_executed" as const,
		satelliteWorkflowStatus: "none" as const,
		placementCommitment:
			"0x0000000000000000000000000000000000000000000000000000000000000001",
		placementManifest: minimalManifest,
		registration: {
			sender: "0x0000000000000000000000000000000000000001",
			registrationTxHash:
				"0x0000000000000000000000000000000000000000000000000000000000000002",
			createdAtIso: "2026-01-01T00:00:00.000Z",
			registerDocumentSha256:
				"0x1212121212121212121212121212121212121212121212121212121212121212",
		},
		parties: [
			{
				role: "sender" as const,
				wallet: "0x0000000000000000000000000000000000000001",
				email: "sender@example.com",
				displayName: "A",
				emailCommitment:
					"0x0000000000000000000000000000000000000000000000000000000000000003",
				authSubjectCommitment:
					"0x0000000000000000000000000000000000000000000000000000000000000004",
			},
		],
		onchainRegistration: null,
		transactions: [
			{
				kind: "file_registered" as const,
				txHash:
					"0x0000000000000000000000000000000000000000000000000000000000000002",
				chainId: 84532,
				contractAddress: "0x0000000000000000000000000000000000000abc",
				summary: "test",
				relatedAddresses: ["0x0000000000000000000000000000000000000001"],
				blockNumber: null,
				timestamp: null,
				fetchedAtIso: null,
			},
		],
		signers: [
			{
				wallet: "0x0000000000000000000000000000000000000002",
				displayName: "S",
				email: "signer@example.com",
				signed: true,
				assignedFieldIds: ["f1"],
				requiredFieldIds: ["f1"],
				optionalFieldIds: [],
				onchainTxHash:
					"0x0000000000000000000000000000000000000000000000000000000000000005",
				signedAtIso: "2026-01-01T00:00:00.000Z",
				messageTimestampIso: "2026-01-01T00:00:00.000Z",
				blockTimestampFromTx: null,
				acknowledgedAtIso: "2026-01-01T00:00:00.000Z",
				firstViewedAtIso: "2026-01-01T00:00:01.000Z",
				completedFieldIds: ["f1"],
				completionsRoot:
					"0x0000000000000000000000000000000000000000000000000000000000000006",
				leafSchemaVersion: 1,
				merkleProofs: [
					{
						fieldId: "f1",
						leafHash:
							"0x0000000000000000000000000000000000000000000000000000000000000007",
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
		...extra,
	};
}

describe("shared vs protocol compliance bundle parity", () => {
	it("canonical JSON matches for satelliteWorkflowStatus none", () => {
		const raw = minimalBundleRaw();
		const shared = zSharedComplianceBundle.parse(raw);
		const protocol = zProtocolComplianceBundle.parse(raw);
		expect(protocolCanonical(protocol)).toBe(sharedCanonical(shared));
	});

	it("canonical JSON matches when pendingSatelliteSummary is present", () => {
		const raw = minimalBundleRaw({
			satelliteWorkflowStatus: "pending" as const,
			pendingSatelliteSummary: { payouts: 1, attachments: 0 },
		});
		const shared = zSharedComplianceBundle.parse(raw);
		const protocol = zProtocolComplianceBundle.parse(raw);
		expect(protocolCanonical(protocol)).toBe(sharedCanonical(shared));
	});

	it("protocol hash matches shared canonical export bytes", async () => {
		const raw = minimalBundleRaw();
		const shared = zSharedComplianceBundle.parse(raw);
		const protocol = zProtocolComplianceBundle.parse(raw);
		const sharedJson = sharedCanonical(shared);
		const protocolHash = await complianceBundleSha256Hex(protocol);
		const sharedBytes = new TextEncoder().encode(sharedJson);
		const sharedDigest = await crypto.subtle.digest("SHA-256", sharedBytes);
		const sharedHex = `0x${[...new Uint8Array(sharedDigest)]
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")}` as `0x${string}`;
		expect(protocolHash).toBe(sharedHex);
	});
});
