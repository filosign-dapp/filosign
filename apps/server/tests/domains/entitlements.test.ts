import { describe, expect, test } from "bun:test";
import { effectivePlanIdFromStatus } from "@/lib/domains/entitlements/effective-plan";
import { recipientSlotCounts } from "@/lib/domains/entitlements/recipient-slots";

describe("effectivePlanIdFromStatus", () => {
	test("returns free when subscription is missing", () => {
		expect(effectivePlanIdFromStatus(undefined)).toBe("free");
	});

	test("keeps paid plan for active/trialing", () => {
		expect(
			effectivePlanIdFromStatus({ planId: "teams", status: "active" }),
		).toBe("teams");
		expect(
			effectivePlanIdFromStatus({ planId: "teams_pro", status: "trialing" }),
		).toBe("teams_pro");
	});

	test("downgrades all non-active statuses to free", () => {
		expect(
			effectivePlanIdFromStatus({ planId: "teams", status: "past_due" }),
		).toBe("free");
		expect(
			effectivePlanIdFromStatus({ planId: "teams", status: "incomplete" }),
		).toBe("free");
		expect(
			effectivePlanIdFromStatus({ planId: "teams", status: "canceled" }),
		).toBe("free");
	});
});

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
