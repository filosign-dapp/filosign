import { beforeEach, describe, expect, mock, test } from "bun:test";
import { getAddress } from "viem";
import { dbQueryResult } from "../support/db-query-result";

const pieceCid = "bafyLATEACK";
const sender = getAddress("0x1111111111111111111111111111111111111111");
const signerWallet = getAddress("0x2222222222222222222222222222222222222222");
const registryAddress = getAddress(
	"0x3333333333333333333333333333333333333333",
);
const ackSignature =
	"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;

const relayBoundSignerAckIfNeeded = mock(async () => {});
const insertedAckRows: Array<Record<string, unknown>> = [];

process.env.POSTHOG_HOST = "https://posthog.example.com";
process.env.POSTHOG_ENABLED = "false";

let fileSelectRows: unknown[] = [];
let participantSelectRows: unknown[] = [];

mock.module("@/lib/domains/files/utils/sign/onchain-bind", () => ({
	relayBoundSignerAckIfNeeded,
}));

mock.module("@/lib/platform/evm", () => ({
	fsEnvelopeRegistryAt: () => ({
		read: {
			validateEnvelopeAckSignature: async () => true,
		},
	}),
}));

mock.module("@/lib/domains/files/utils/piece-helpers", () => ({
	getValidAck: async () => null,
	requireAckForParticipantAccess: async () => {
		throw new Error("not used in pieceAck test");
	},
}));

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: {
			files: {
				pieceCid: "pieceCid",
				sender: "sender",
				registryAddress: "registryAddress",
				revokedBeforeCompletedAt: "revokedBeforeCompletedAt",
				completedAt: "completedAt",
			},
			fileParticipants: {
				wallet: "wallet",
				filePieceCid: "filePieceCid",
			},
			users: {
				walletAddress: "walletAddress",
				email: "email",
				authProviderId: "authProviderId",
			},
			fileAcknowledgements: {
				filePieceCid: "filePieceCid",
				wallet: "wallet",
				ack: "ack",
				acknowledgedAt: "acknowledgedAt",
				intentVersion: "intentVersion",
				requestIp: "requestIp",
				requestUserAgent: "requestUserAgent",
				createdAt: "createdAt",
				updatedAt: "updatedAt",
			},
		},
		select: () => ({
			from: (table: { pieceCid?: string; wallet?: string }) => ({
				where: () =>
					dbQueryResult(
						table.pieceCid != null ? fileSelectRows : participantSelectRows,
					),
				innerJoin: () => ({
					where: () => dbQueryResult(participantSelectRows),
				}),
			}),
		}),
		insert: () => ({
			values: (row: Record<string, unknown>) => ({
				onConflictDoNothing: () => ({
					returning: () => {
						insertedAckRows.push(row);
						return dbQueryResult([{ filePieceCid: pieceCid }]);
					},
				}),
			}),
		}),
	},
}));

const { pieceAck } = await import("@/lib/domains/files/piece");

describe("pieceAck when envelope is complete", () => {
	beforeEach(() => {
		relayBoundSignerAckIfNeeded.mockClear();
		insertedAckRows.length = 0;
		fileSelectRows = [
			{
				pieceCid,
				sender,
				registryAddress,
				revokedBeforeCompletedAt: null,
				completedAt: new Date("2026-01-02T00:00:00.000Z"),
			},
		];
		participantSelectRows = [
			{
				wallet: signerWallet,
				email: "signer@example.com",
				authProviderId: "auth-subject-1",
			},
		];
	});

	test("persists off-chain ack and skips on-chain relay", async () => {
		await pieceAck({
			userWallet: signerWallet,
			pieceCid,
			body: {
				signature: ackSignature,
				timestamp: 1_700_000_000,
			},
		});

		expect(relayBoundSignerAckIfNeeded).toHaveBeenCalledTimes(1);
		expect(relayBoundSignerAckIfNeeded).toHaveBeenCalledWith(
			expect.objectContaining({
				envelopeComplete: true,
				signerWallet,
			}),
		);
		expect(insertedAckRows).toHaveLength(1);
		expect(insertedAckRows[0]).toMatchObject({
			filePieceCid: pieceCid,
			wallet: signerWallet,
			ack: ackSignature,
		});
	});
});
