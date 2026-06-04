import { describe, expect, test } from "bun:test";
import { zFileCommentAppendBody } from "@/lib/domains/files/comments";

describe("file-comments", () => {
	test("zFileCommentAppendBody accepts ciphertext append payload", () => {
		const parsed = zFileCommentAppendBody.safeParse({
			pieceCid: "bafytest",
			commentId: "550e8400-e29b-41d4-a716-446655440000",
			ciphertext: `0x${"ab".repeat(32)}`,
		});
		expect(parsed.success).toBe(true);
	});

	test("zFileCommentAppendBody rejects missing pieceCid", () => {
		const parsed = zFileCommentAppendBody.safeParse({
			commentId: "550e8400-e29b-41d4-a716-446655440000",
			ciphertext: `0x${"ab".repeat(32)}`,
		});
		expect(parsed.success).toBe(false);
	});
});
