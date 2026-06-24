import { beforeEach, describe, expect, mock, test } from "bun:test";
import { getAddress } from "viem";
import { dbQueryResult } from "../support/db-query-result";

const sender = getAddress("0x1111111111111111111111111111111111111111");
const pieceCid = "bafyROTATE";
const newToken = "new-token-abcdefghijklmnop";
const expiresAt = new Date("2026-12-31T00:00:00.000Z");

const insertedOutboxRows: Array<Record<string, unknown>> = [];
const enqueueOutboxIds: string[] = [];
let selectStep = 0;

mock.module("@/lib/domains/invites", () => ({
	inviteExpiresAt: () => expiresAt,
	pendingFileColdInviteFilter: () => ({ type: "pending-filter" }),
}));

mock.module("@/lib/platform/jobs", () => ({
	insertJobOutboxRows: async (
		_tx: unknown,
		rows: Array<Record<string, unknown>>,
	) => {
		insertedOutboxRows.push(...rows);
		return rows.map((row, index) => ({
			id: `outbox-${index}`,
			...row,
		}));
	},
	enqueueOutboxByIds: async (ids: string[]) => {
		enqueueOutboxIds.push(...ids);
	},
}));

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: {
			files: {
				pieceCid: "pieceCid",
				sender: "sender",
				displayName: "displayName",
			},
			fileColdInvites: {
				email: "email",
				filePieceCid: "filePieceCid",
				inviteToken: "inviteToken",
				wrappedEncryptionKey: "wrappedEncryptionKey",
				expiresAt: "expiresAt",
				updatedAt: "updatedAt",
				status: "status",
			},
			users: {
				walletAddress: "walletAddress",
				email: "email",
				firstName: "firstName",
				lastName: "lastName",
				username: "username",
			},
		},
		select: () => ({
			from: () => ({
				where: () => {
					selectStep += 1;
					if (selectStep === 1) {
						return dbQueryResult([
							{
								sender,
								displayName: "Rotated Doc",
							},
						]);
					}
					if (selectStep === 2) {
						return dbQueryResult([
							{ email: "cold1@example.com" },
							{ email: "cold2@example.com" },
						]);
					}
					return dbQueryResult([
						{
							email: "sender@example.com",
							firstName: "Alex",
							lastName: "Chen",
							username: null,
						},
					]);
				},
			}),
		}),
		update: () => ({
			set: () => ({
				where: async () => {},
			}),
		}),
		transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
	},
}));

describe("filesColdInviteRegenerate", () => {
	beforeEach(() => {
		selectStep = 0;
		insertedOutboxRows.length = 0;
		enqueueOutboxIds.length = 0;
	});

	test("enqueues rotated cold_doc_invite per recipient with new token idempotency", async () => {
		const { filesColdInviteRegenerate } = await import(
			"@/lib/domains/files/invites"
		);

		const result = await filesColdInviteRegenerate({
			userWallet: sender,
			pieceCid,
			body: {
				inviteToken: newToken,
				wrappedEncryptionKey:
					"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			},
		});

		expect(result.recipientEmails).toEqual([
			"cold1@example.com",
			"cold2@example.com",
		]);
		expect(insertedOutboxRows).toHaveLength(2);
		for (const row of insertedOutboxRows) {
			expect(row.kind).toBe("cold_doc_invite");
			expect(row.payload).toMatchObject({
				intent: "rotated",
				inviteToken: newToken,
				pieceCid,
			});
		}
		expect(insertedOutboxRows[0]?.idempotencyKey).not.toBe(
			insertedOutboxRows[1]?.idempotencyKey,
		);
		expect(enqueueOutboxIds).toEqual(["outbox-0", "outbox-1"]);
	});
});
