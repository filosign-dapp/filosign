import { describe, expect, it } from "bun:test";
import {
	COMPLIANCE_CHAIN_TX_KINDS,
	canonicalComplianceBundleJson,
	zComplianceBundle,
} from "../compliance-bundle";
import type { PlacementManifest } from "../placement-manifest";

const minimalManifest: PlacementManifest = {
	version: 2,
	fields: [
		{
			id: "f1",
			pageIndex: 0,
			rect: { x: 0, y: 0, width: 0.1, height: 0.1 },
			assignedRecipientEmail: "signer@example.com",
			required: true,
			type: "signature",
		},
	],
};

describe("ComplianceBundle", () => {
	it("parses minimal bundle and canonical JSON is stable", () => {
		const raw = {
			version: 5 as const,
			pieceCid: "bafyTEST",
			chainId: 84532,
			exportedAtIso: "2026-01-01T00:00:00.000Z",
			executionStatus: "fully_executed" as const,
			placementCommitment:
				"0x0000000000000000000000000000000000000000000000000000000000000001",
			placementManifest: minimalManifest,
			registration: {
				sender: "0x0000000000000000000000000000000000000001",
				registrationTxHash:
					"0x0000000000000000000000000000000000000000000000000000000000000002",
				createdAtIso: "2026-01-01T00:00:00.000Z",
			},
			parties: [
				{
					role: "sender" as const,
					wallet: "0x0000000000000000000000000000000000000001",
					email: "sender@example.com",
					displayName: "A",
					emailCommitment:
						"0x0000000000000000000000000000000000000000000000000000000000000003",
					privySubjectCommitment:
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
			offChainEvidence: { acknowledgements: [] },
		};
		const a = zComplianceBundle.parse(raw);
		const b = zComplianceBundle.parse(raw);
		expect(canonicalComplianceBundleJson(a)).toBe(
			canonicalComplianceBundleJson(b),
		);
	});

	it("COMPLIANCE_CHAIN_TX_KINDS covers all lifecycle labels", () => {
		expect(COMPLIANCE_CHAIN_TX_KINDS.length).toBe(3);
	});
});
