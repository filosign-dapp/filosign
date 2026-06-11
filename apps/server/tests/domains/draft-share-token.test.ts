import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { ORPCError } from "@orpc/server";

describe("assertActiveDraftShareForToken", () => {
	beforeAll(() => {
		mock.module("@/lib/platform/db", () => ({
			default: {
				schema: {
					draftExternalShares: {},
					draftComments: {},
					users: {},
				},
				select: () => ({
					from: () => ({
						where: () => ({
							limit: () => Promise.resolve([]),
						}),
					}),
				}),
			},
		}));
	});

	afterAll(() => {
		mock.restore();
	});

	test("rejects invalid or inactive invite tokens", async () => {
		const { assertActiveDraftShareForToken } = await import(
			"@/lib/domains/drafts/utils/comments"
		);

		try {
			await assertActiveDraftShareForToken(
				"invalid-invite-token",
				"550e8400-e29b-41d4-a716-446655440001",
			);
			throw new Error("expected invite not found");
		} catch (error) {
			expect(error).toBeInstanceOf(ORPCError);
			if (error instanceof ORPCError) {
				expect(error.data).toMatchObject({
					appCode: "DRAFTS.INVITE_NOT_FOUND",
				});
			}
		}
	});
});
