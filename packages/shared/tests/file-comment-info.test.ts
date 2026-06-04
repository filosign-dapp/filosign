import { describe, expect, test } from "bun:test";
import { fileCommentInfo } from "../utils/crypto";

describe("fileCommentInfo", () => {
	test("is stable and distinct from draft comments", () => {
		const pieceCid = "bafyPiece";
		const commentId = "550e8400-e29b-41d4-a716-446655440000";
		expect(fileCommentInfo(pieceCid, commentId)).toBe(
			`filosign:file-comment:v1:${pieceCid}:${commentId}`,
		);
		expect(fileCommentInfo(pieceCid, commentId)).not.toContain("draft-comment");
	});
});
