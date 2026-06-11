import { beforeEach, describe, expect, mock, test } from "bun:test";
import { ORPCError } from "@orpc/server";
import { createMockRedis } from "../support/mock-redis";

const mockRedis = createMockRedis();

const redisClient = {
	...mockRedis.client,
	incr: async (key: string) => {
		const current = Number.parseInt(mockRedis.store.get(key) ?? "0", 10);
		const next = current + 1;
		mockRedis.store.set(key, String(next));
		return next;
	},
	expire: async (_key: string, _ttl: number) => 1,
};

mock.module("@/lib/platform/cache/session", () => ({
	getRedis: () => redisClient,
}));

const { assertDraftReviewPublicRateLimit } = await import(
	"@/lib/platform/cache/draft-review-rate-limit"
);

beforeEach(() => {
	mockRedis.store.clear();
	mock.module("@/lib/platform/cache/session", () => ({
		getRedis: () => redisClient,
	}));
});

describe("assertDraftReviewPublicRateLimit", () => {
	test("allows requests under the per-minute list cap", async () => {
		for (let i = 0; i < 30; i += 1) {
			await assertDraftReviewPublicRateLimit({
				action: "list",
				inviteToken: "invite-token-abc",
				clientIp: "203.0.113.10",
			});
		}
	});

	test("throws DRAFTS.RATE_LIMITED after the per-minute append cap", async () => {
		for (let i = 0; i < 10; i += 1) {
			await assertDraftReviewPublicRateLimit({
				action: "append",
				inviteToken: "invite-token-append",
				clientIp: "203.0.113.11",
			});
		}

		try {
			await assertDraftReviewPublicRateLimit({
				action: "append",
				inviteToken: "invite-token-append",
				clientIp: "203.0.113.11",
			});
			throw new Error("expected rate limit");
		} catch (error) {
			expect(error).toBeInstanceOf(ORPCError);
			if (error instanceof ORPCError) {
				expect(error.data).toMatchObject({ appCode: "DRAFTS.RATE_LIMITED" });
			}
		}
	});

	test("throws DRAFTS.RATE_LIMITED after the per-minute list cap", async () => {
		for (let i = 0; i < 30; i += 1) {
			await assertDraftReviewPublicRateLimit({
				action: "list",
				inviteToken: "invite-token-abc",
				clientIp: "203.0.113.10",
			});
		}

		try {
			await assertDraftReviewPublicRateLimit({
				action: "list",
				inviteToken: "invite-token-abc",
				clientIp: "203.0.113.10",
			});
			throw new Error("expected rate limit");
		} catch (error) {
			expect(error).toBeInstanceOf(ORPCError);
			if (error instanceof ORPCError) {
				expect(error.data).toMatchObject({ appCode: "DRAFTS.RATE_LIMITED" });
			}
		}
	});
});
