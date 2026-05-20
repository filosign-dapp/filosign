import { describe, expect, test } from "bun:test";
import { recipientSlotCounts } from "./recipient-slots";

describe("recipientSlotCounts", () => {
	test("sums warm participants and cold invites", () => {
		const counts = recipientSlotCounts({
			participants: [{ isSigner: true }, { isSigner: false }],
			coldInvites: [{ isSigner: true }],
		});
		expect(counts.warmParticipantCount).toBe(2);
		expect(counts.coldInviteCount).toBe(1);
		expect(counts.recipientSlotCount).toBe(3);
		expect(counts.signerSlotCount).toBe(2);
	});
});
