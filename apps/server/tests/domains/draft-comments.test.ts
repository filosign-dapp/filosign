import { describe, expect, test } from "bun:test";
import type { DraftCommentRow } from "@/lib/domains/drafts/utils/comments";

function commentRow(overrides: Partial<DraftCommentRow> = {}): DraftCommentRow {
	return {
		id: "550e8400-e29b-41d4-a716-446655440000",
		authorWallet: null,
		inviteToken: "invite-token-abcdefghij",
		ciphertext: `0x${"ab".repeat(32)}`,
		createdAt: new Date("2026-06-01T12:00:00Z"),
		authorEmail: null,
		authorFirstName: null,
		authorLastName: null,
		shareEmail: null,
		...overrides,
	};
}

describe("mapDraftCommentResponse", () => {
	test("prefers team member name over email", async () => {
		const { mapDraftCommentResponse } = await import(
			"@/lib/domains/drafts/utils/comments"
		);
		const mapped = mapDraftCommentResponse(
			commentRow({
				authorWallet: "0x1111111111111111111111111111111111111111",
				authorFirstName: "Ada",
				authorLastName: "Lovelace",
				authorEmail: "ada@example.com",
			}),
		);

		expect(mapped.authorDisplayName).toBe("Ada Lovelace");
		expect(mapped.authorEmail).toBe("ada@example.com");
	});

	test("falls back to external share email for invite-token comments", async () => {
		const { mapDraftCommentResponse } = await import(
			"@/lib/domains/drafts/utils/comments"
		);
		const mapped = mapDraftCommentResponse(
			commentRow({
				inviteToken: "invite-token-abcdefghij",
				shareEmail: "reviewer@example.com",
			}),
		);

		expect(mapped.authorDisplayName).toBe("reviewer@example.com");
		expect(mapped.authorEmail).toBe("reviewer@example.com");
	});

	test("leaves author fields undefined when no identity is known", async () => {
		const { mapDraftCommentResponse } = await import(
			"@/lib/domains/drafts/utils/comments"
		);
		const mapped = mapDraftCommentResponse(commentRow());

		expect(mapped.authorDisplayName).toBeUndefined();
		expect(mapped.authorEmail).toBeUndefined();
	});
});
