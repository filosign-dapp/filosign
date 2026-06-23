import { describe, expect, test } from "bun:test";
import type { PlacementManifest } from "@filosign/shared";
import type { Address, Hex } from "viem";
import {
	buildComplianceSigners,
	complianceExecutionStatus,
	listComplianceSignerParticipants,
} from "@/lib/platform/compliance/build/signers";
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
		attachmentRows: [],
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

describe("sender-as-signer compliance roster", () => {
	const senderWallet = "0x2222222222222222222222222222222222222222" as Address;
	const senderEmail = "sender@example.com";
	const practiceManifest: PlacementManifest = {
		version: 1,
		documents: [
			{
				id: "doc1",
				name: "welcome.pdf",
				sha256Plaintext: `0x${"ab".repeat(32)}`,
				pageCount: 1,
			},
		],
		fields: [
			{
				id: "practice-signature-1",
				documentId: "doc1",
				pageIndex: 0,
				rect: { x: 0.1, y: 0.1, width: 0.3, height: 0.08 },
				assignedRecipientEmail: senderEmail,
				required: true,
				type: "signature",
			},
		],
	};

	function practiceCtx(
		overrides?: Partial<ComplianceLoadContext>,
	): ComplianceLoadContext {
		return {
			pieceCid: "bafyPRACTICE",
			participantRows: [
				{
					wallet: senderWallet,
					role: "sender",
					firstName: "Practice",
					lastName: "User",
					email: senderEmail,
					username: null,
					authProviderId: null,
				},
			],
			fileRecord: {
				sender: senderWallet,
				onchainTxHash: `0x${"01".repeat(32)}` as Hex,
				registryAddress:
					"0x3333333333333333333333333333333333333333" as Address,
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				placementCommitment: `0x${"02".repeat(32)}` as Hex,
				documentSha256: `0x${"03".repeat(32)}` as Hex,
				placementManifestJson: practiceManifest,
				revokedBeforeCompletedAt: null,
				revokedBy: null,
				completedAt: new Date("2026-01-02T00:00:00.000Z"),
				revokeOnchainTxHash: null,
			},
			manifest: practiceManifest,
			sigRows: [],
			draftByWallet: new Map(),
			sigByWallet: new Map([
				[
					senderWallet.toLowerCase(),
					{
						signer: senderWallet,
						onchainTxHash: `0x${"04".repeat(32)}` as Hex,
						createdAt: new Date("2026-01-02T00:00:00.000Z"),
						completedFieldIds: ["practice-signature-1"],
						completionsRoot: `0x${"05".repeat(32)}` as Hex,
						leafSchemaVersion: 1,
						requestIp: null,
						requestUserAgent: null,
					},
				],
			]),
			ackRowsRaw: [],
			viewRowsRaw: [],
			coldInviteClaimRows: [],
			onchainRegistration: null,
			executionStatus: "partially_executed",
			exportedAtIso: "2026-01-02T00:00:00.000Z",
			senderNorm: senderWallet,
			settlementRows: [],
			attachmentRows: [],
			amendmentRows: [],
			settlementRecipientAckRows: [],
			...overrides,
		};
	}

	test("includes sender when manifest assigns fields and no signer rows exist", () => {
		const ctx = practiceCtx();
		const roster = listComplianceSignerParticipants({
			participantRows: ctx.participantRows,
			manifest: ctx.manifest,
			senderNorm: ctx.senderNorm,
		});
		expect(roster).toHaveLength(1);
		expect(roster[0]?.role).toBe("sender");
	});

	test("buildComplianceSigners exports signed sender for practice envelope", () => {
		const ctx = practiceCtx();
		const signers = buildComplianceSigners(ctx);
		expect(signers).toHaveLength(1);
		expect(signers[0]?.wallet).toBe(senderWallet);
		expect(signers[0]?.signed).toBe(true);
		expect(signers[0]?.completedFieldIds).toEqual(["practice-signature-1"]);
	});

	test("complianceExecutionStatus is fully_executed when sender-as-signer signed", () => {
		const ctx = practiceCtx();
		const roster = listComplianceSignerParticipants({
			participantRows: ctx.participantRows,
			manifest: ctx.manifest,
			senderNorm: ctx.senderNorm,
		});
		expect(complianceExecutionStatus(roster, ctx.sigByWallet)).toBe(
			"fully_executed",
		);
	});
});
