import { describe, expect, test } from "bun:test";
import type { PlacementManifest } from "@filosign/shared";
import type { Address, Hex } from "viem";
import { buildComplianceSigners } from "@/lib/platform/compliance/build/signers";
import type { ComplianceLoadContext } from "@/lib/platform/compliance/load-context";

const signerWallet = "0x1111111111111111111111111111111111111111" as Address;
const validAck = `0x${"ab".repeat(64)}` as Hex;
const invalidAck = "0x1234";
const acknowledgedAt = new Date("2026-01-15T12:00:00.000Z");

const manifest: PlacementManifest = {
	version: 1,
	documents: [],
	fields: [],
};

function buildCtx(args: {
	ackRowsRaw: ComplianceLoadContext["ackRowsRaw"];
}): ComplianceLoadContext {
	return {
		pieceCid: "bafyCOMPLIANCE",
		participantRows: [
			{
				wallet: signerWallet,
				role: "signer",
				firstName: "Test",
				lastName: "Signer",
				email: "signer@example.com",
				username: null,
				authProviderId: null,
			},
		],
		fileRecord: {
			sender: "0x2222222222222222222222222222222222222222" as Address,
			onchainTxHash: `0x${"01".repeat(32)}` as Hex,
			registryAddress: "0x3333333333333333333333333333333333333333" as Address,
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			placementCommitment: `0x${"02".repeat(32)}` as Hex,
			documentSha256: `0x${"03".repeat(32)}` as Hex,
			placementManifestJson: manifest,
			revokedBeforeCompletedAt: null,
			revokedBy: null,
			completedAt: null,
			revokeOnchainTxHash: null,
		},
		manifest,
		sigRows: [],
		draftByWallet: new Map(),
		sigByWallet: new Map(),
		ackRowsRaw: args.ackRowsRaw,
		viewRowsRaw: [],
		coldInviteClaimRows: [],
		onchainRegistration: null,
		executionStatus: "partially_executed",
		exportedAtIso: "2026-01-01T00:00:00.000Z",
		senderNorm: "0x2222222222222222222222222222222222222222" as Address,
		settlementRows: [],
		amendmentRows: [],
		settlementRecipientAckRows: [],
	};
}

describe("buildComplianceSigners ack filtering", () => {
	test("ignores invalid ack signatures when building signer timeline", () => {
		const signers = buildComplianceSigners(
			buildCtx({
				ackRowsRaw: [
					{
						wallet: signerWallet,
						ackCreatedAt: acknowledgedAt,
						acknowledgedAt,
						intentVersion: "v1",
						ack: invalidAck,
						email: "signer@example.com",
						authProviderId: null,
					},
				],
			}),
		);

		expect(signers).toHaveLength(1);
		expect(signers[0]?.acknowledgedAtIso).toBeNull();
	});

	test("uses the first valid ack signature for a wallet", () => {
		const signers = buildComplianceSigners(
			buildCtx({
				ackRowsRaw: [
					{
						wallet: signerWallet,
						ackCreatedAt: acknowledgedAt,
						acknowledgedAt,
						intentVersion: "v1",
						ack: invalidAck,
						email: "signer@example.com",
						authProviderId: null,
					},
					{
						wallet: signerWallet,
						ackCreatedAt: acknowledgedAt,
						acknowledgedAt,
						intentVersion: "v1",
						ack: validAck,
						email: "signer@example.com",
						authProviderId: null,
					},
				],
			}),
		);

		expect(signers[0]?.acknowledgedAtIso).toBe(acknowledgedAt.toISOString());
	});
});
