import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { ORPCError } from "@orpc/server";
import { getAddress } from "viem";
import {
	assertEntitlement,
	calendarMonthPeriod,
} from "@/lib/domains/entitlements";
import { dbQueryResult } from "../support/db-query-result";

const wallet = getAddress("0x0000000000000000000000000000000000000001");

describe("attachments-register", () => {
	describe("insertSingleAttachmentPacket cold wraps", () => {
		test("persists per-recipient invite tokens", async () => {
			const coldWrapRows: { email: string; inviteToken: string }[] = [];
			let packetInsertCount = 0;

			const tx = {
				insert: () => ({
					values: (rows: unknown) => {
						const arr = Array.isArray(rows) ? rows : [rows];
						for (const row of arr) {
							if (
								row &&
								typeof row === "object" &&
								"inviteToken" in row &&
								"wrappedPacketDek" in row
							) {
								const typed = row as { email: string; inviteToken: string };
								coldWrapRows.push({
									email: typed.email,
									inviteToken: typed.inviteToken,
								});
							}
						}
						packetInsertCount += 1;
						if (packetInsertCount === 1) {
							return {
								returning: async () => [{ id: "packet-row-1" }],
							};
						}
						return Promise.resolve(undefined);
					},
				}),
			};

			const { insertSingleAttachmentPacket } = await import(
				"@/lib/domains/attachments/utils/insert-packet"
			);

			await insertSingleAttachmentPacket(tx as never, {
				pieceCid: "piece-cid-abc12345",
				packet: {
					packetId: "p1",
					releaseMode: "review",
					recipientEmails: ["a@example.com", "b@example.com"],
					packetCid: `0x${"a".repeat(64)}`,
					coldWraps: [
						{
							email: "a@example.com",
							wrappedPacketDek: `0x${"ab".repeat(32)}`,
						},
						{
							email: "b@example.com",
							wrappedPacketDek: `0x${"cd".repeat(32)}`,
						},
					],
				},
				coldInvites: [
					{ email: "a@example.com", inviteToken: "token-aaaaaaaaaaaaaaaa" },
					{ email: "b@example.com", inviteToken: "token-bbbbbbbbbbbbbbbb" },
				],
			});

			expect(coldWrapRows).toEqual([
				{ email: "a@example.com", inviteToken: "token-aaaaaaaaaaaaaaaa" },
				{ email: "b@example.com", inviteToken: "token-bbbbbbbbbbbbbbbb" },
			]);
		});
	});

	describe("insertAttachmentPacketsForFile entitlement gates", () => {
		beforeAll(() => {
			mock.module("@/env", () => ({
				default: { DEPLOYMENT: "production" },
			}));
			mock.module("@/lib/domains/entitlements", () => ({
				resolveEntitlementContext: async () => ({
					subject: { type: "user", wallet },
					planId: "individual",
					periodStart: calendarMonthPeriod().periodStart,
					usage: { "documents.sent.monthly": 0 },
				}),
				assertEntitlement,
			}));
		});

		afterAll(() => {
			mock.restore();
		});

		test("throws ENTITLEMENT.FEATURE_DISABLED for partial roster on Solo", async () => {
			const { insertAttachmentPacketsForFile } = await import(
				"@/lib/domains/attachments/register"
			);

			try {
				await insertAttachmentPacketsForFile({
					pieceCid: "piece-cid-abc12345",
					sender: wallet,
					organizationId: "00000000-0000-7000-8000-000000000001",
					rosterEmails: ["sender@example.com", "signer@example.com"],
					coldInvites: [],
					packets: [
						{
							packetId: "p1",
							releaseMode: "review",
							recipientEmails: ["sender@example.com"],
							packetCid: `0x${"a".repeat(64)}`,
						},
					],
				});
				expect.unreachable("expected entitlement failure");
			} catch (error) {
				expect(error).toBeInstanceOf(ORPCError);
				const orpcError = error as ORPCError<
					string,
					{ appCode?: string } | undefined
				>;
				expect(orpcError.data?.appCode).toBe("ENTITLEMENT.FEATURE_DISABLED");
			}
		});
	});

	describe("compileRegisterRosterEmails", () => {
		let selectQueue: unknown[][] = [];

		beforeAll(() => {
			mock.module("@/lib/platform/db", () => ({
				default: {
					schema: { users: {} },
					select: () => ({
						from: () => ({
							where: () => {
								const rows = selectQueue.shift() ?? [];
								return dbQueryResult(rows);
							},
						}),
					}),
				},
			}));
		});

		afterAll(() => {
			mock.restore();
		});

		test("combines sender, cold invites, and warm participant emails", async () => {
			selectQueue = [
				[{ email: "signer@example.com" }, { email: "viewer@example.com" }],
			];

			const { compileRegisterRosterEmails } = await import(
				"@/lib/domains/files/utils/roster-emails"
			);

			const roster = await compileRegisterRosterEmails({
				senderEmail: "Sender@Example.com",
				participants: [
					{
						address: getAddress("0x0000000000000000000000000000000000000002"),
						isSigner: true,
					},
					{
						address: getAddress("0x0000000000000000000000000000000000000003"),
						isSigner: false,
					},
				],
				coldInvites: [{ email: "cold@example.com" }],
			});

			expect(roster).toEqual([
				"sender@example.com",
				"cold@example.com",
				"signer@example.com",
				"viewer@example.com",
			]);
		});
	});
});
