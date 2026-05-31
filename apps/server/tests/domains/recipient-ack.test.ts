import { afterAll, describe, expect, mock, test } from "bun:test";
import { SETTLEMENT_FEATURE_TERMS_VERSION } from "@filosign/shared";
import { dbQueryResult } from "../support/db-query-result";

const pieceCid = "bafytestpiece";
const signer = "0x1111111111111111111111111111111111111111" as const;

let hasRules = false;
let inserted: unknown[] = [];

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: {
			fileSettlementRules: {},
			fileSettlementRecipientAcks: {},
		},
		select: () => ({
			from: () => ({
				where: () => ({
					limit: () => dbQueryResult(hasRules ? [{ pieceCid }] : []),
				}),
			}),
		}),
		insert: () => ({
			values: (row: unknown) => {
				inserted.push(row);
				return {
					onConflictDoUpdate: () => Promise.resolve(),
				};
			},
		}),
	},
}));

afterAll(() => {
	mock.restore();
});

describe("settlement recipient ack", () => {
	test("requires ack body when indexed settlement rules exist", async () => {
		hasRules = true;
		const { assertSettlementRecipientAckProvided } = await import(
			"@/lib/domains/settlement-access/utils/recipient-ack"
		);

		await expect(
			assertSettlementRecipientAckProvided({
				pieceCid,
				signerWallet: signer,
				body: {},
			}),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: expect.stringContaining("Acknowledge"),
		});
	});

	test("rejects outdated ack terms version", async () => {
		hasRules = true;
		const { assertSettlementRecipientAckProvided } = await import(
			"@/lib/domains/settlement-access/utils/recipient-ack"
		);

		await expect(
			assertSettlementRecipientAckProvided({
				pieceCid,
				signerWallet: signer,
				body: {
					settlementRecipientAck: {
						termsVersion: "stale",
						acceptedAt: Date.now(),
					},
				},
			}),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: expect.stringContaining("outdated"),
		});
	});

	test("records ack with IP and user agent when rules exist", async () => {
		hasRules = true;
		inserted = [];
		const { recordSettlementRecipientAck } = await import(
			"@/lib/domains/settlement-access/utils/recipient-ack"
		);

		const acceptedAt = new Date("2026-05-01T12:00:00Z");
		await recordSettlementRecipientAck({
			pieceCid,
			signerWallet: signer,
			termsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
			acceptedAt,
			requestIp: "203.0.113.1",
			requestUserAgent: "TestAgent/1.0",
		});

		expect(inserted).toHaveLength(1);
		expect(inserted[0]).toMatchObject({
			filePieceCid: pieceCid,
			requestIp: "203.0.113.1",
			requestUserAgent: "TestAgent/1.0",
		});
	});
});
