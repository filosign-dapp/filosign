import { beforeEach, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAddress } from "viem";
import { dbQueryResult } from "../support/db-query-result";

const sender = getAddress("0x1111111111111111111111111111111111111111");
const signerWallet = getAddress("0x2222222222222222222222222222222222222222");
const pieceCid = "bafyTURN";

const sequentialRouting = {
	routingMode: 1 as const,
	routingOrderEmails: ["signer1@example.com", "signer2@example.com"],
};

let fileRow: Record<string, unknown> | null = {
	displayName: "Vendor Agreement",
	completedAt: null,
	revokedBeforeCompletedAt: null,
	isPractice: false,
};
let senderProfileRows: unknown[] = [
	{
		email: "sender@example.com",
		firstName: "Alex",
		lastName: "Chen",
		username: null,
	},
];
let warmSignerRows: unknown[] = [
	{ wallet: signerWallet, email: "signer1@example.com" },
];
let coldInviteRows: unknown[] = [];
let signatureRows: unknown[] = [];
let selectStep = 0;

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: {
			files: {
				pieceCid: "pieceCid",
				displayName: "displayName",
				completedAt: "completedAt",
				revokedBeforeCompletedAt: "revokedBeforeCompletedAt",
				isPractice: "isPractice",
			},
			fileParticipants: {
				wallet: "wallet",
				filePieceCid: "filePieceCid",
				role: "role",
			},
			fileColdInvites: {
				email: "email",
				inviteToken: "inviteToken",
				filePieceCid: "filePieceCid",
				isSigner: "isSigner",
				status: "status",
				expiresAt: "expiresAt",
			},
			fileSignatures: {
				signer: "signer",
				filePieceCid: "filePieceCid",
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
			from: () => {
				selectStep += 1;
				if (selectStep === 3) {
					return {
						innerJoin: () => ({
							where: () => dbQueryResult(warmSignerRows),
						}),
					};
				}
				return {
					where: () => {
						if (selectStep === 1) {
							return dbQueryResult(fileRow ? [fileRow] : []);
						}
						if (selectStep === 2) {
							return dbQueryResult(senderProfileRows);
						}
						if (selectStep === 4) {
							return dbQueryResult(
								warmSignerRows.length > 0 ? signatureRows : coldInviteRows,
							);
						}
						return dbQueryResult(coldInviteRows);
					},
				};
			},
		}),
	},
}));

describe("buildSignerTurnEmailOutboxRows", () => {
	beforeEach(() => {
		selectStep = 0;
		fileRow = {
			displayName: "Vendor Agreement",
			completedAt: null,
			revokedBeforeCompletedAt: null,
			isPractice: false,
		};
		senderProfileRows = [
			{
				email: "sender@example.com",
				firstName: "Alex",
				lastName: "Chen",
				username: null,
			},
		];
		warmSignerRows = [{ wallet: signerWallet, email: "signer1@example.com" }];
		coldInviteRows = [];
		signatureRows = [];
	});

	test("returns empty rows for parallel routing", async () => {
		const { buildSignerTurnEmailOutboxRows } = await import(
			"@/lib/domains/files/utils/signer-turn-email"
		);

		const rows = await buildSignerTurnEmailOutboxRows({
			pieceCid,
			sender,
			registerRoutingJson: { routingMode: 0 },
			turnEpoch: 0,
		});

		expect(rows).toEqual([]);
	});

	test("builds warm signer_turn row with turn epoch idempotency", async () => {
		const { buildSignerTurnEmailOutboxRows } = await import(
			"@/lib/domains/files/utils/signer-turn-email"
		);

		const rows = await buildSignerTurnEmailOutboxRows({
			pieceCid,
			sender,
			registerRoutingJson: sequentialRouting,
			nextSignerEmail: "signer1@example.com",
			turnEpoch: 0,
		});

		expect(rows).toHaveLength(1);
		expect(rows[0]?.kind).toBe("signer_turn");
		expect(rows[0]?.payload).toMatchObject({
			to: "signer1@example.com",
			variant: "warm",
			pieceCid,
		});
		expect(rows[0]?.idempotencyKey).toBeString();
		expect(rows[0]?.idempotencyKey.length).toBeGreaterThan(10);
	});

	test("builds cold signer_turn row with invite token", async () => {
		warmSignerRows = [];
		coldInviteRows = [
			{
				email: "cold@example.com",
				inviteToken: "token-abcdefghijklmnop",
			},
		];

		const { buildSignerTurnEmailOutboxRows } = await import(
			"@/lib/domains/files/utils/signer-turn-email"
		);

		const rows = await buildSignerTurnEmailOutboxRows({
			pieceCid,
			sender,
			registerRoutingJson: {
				routingMode: 1,
				routingOrderEmails: ["cold@example.com"],
			},
			nextSignerEmail: "cold@example.com",
			turnEpoch: 1,
		});

		expect(rows).toHaveLength(1);
		expect(rows[0]?.payload).toMatchObject({
			to: "cold@example.com",
			variant: "cold",
			inviteToken: "token-abcdefghijklmnop",
		});
		expect(rows[0]?.idempotencyKey).toBeString();
	});

	test("skips when warm signer already signed", async () => {
		signatureRows = [{ signer: signerWallet }];

		const { buildSignerTurnEmailOutboxRows } = await import(
			"@/lib/domains/files/utils/signer-turn-email"
		);

		const rows = await buildSignerTurnEmailOutboxRows({
			pieceCid,
			sender,
			registerRoutingJson: sequentialRouting,
			nextSignerEmail: "signer1@example.com",
			turnEpoch: 1,
		});

		expect(rows).toEqual([]);
	});

	test("routing-complete enqueues turn email while waiting for signers", () => {
		const src = readFileSync(
			join(
				import.meta.dir,
				"../../lib/domains/files/utils/sign/routing-complete.ts",
			),
			"utf8",
		);
		expect(src).toContain("buildSignerTurnEmailOutboxRows");
		expect(src).toContain("waitingForMoreSigners(progress)");
		expect(src).toContain("progress.nextSignerEmail");
	});
});

describe("signer turn email copy", () => {
	test("subject names the sender", async () => {
		const { signerTurnSubject } = await import("@filosign/emails");
		expect(signerTurnSubject({ senderLabelRaw: "Alex Chen" })).toBe(
			"Alex Chen is ready for your signature",
		);
	});
});
