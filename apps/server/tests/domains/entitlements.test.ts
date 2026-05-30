import { describe, expect, test } from "bun:test";
import { effectivePlanIdFromStatus } from "@/lib/domains/entitlements/effective-plan";

describe("effectivePlanIdFromStatus", () => {
	const now = new Date("2026-06-01T12:00:00.000Z");

	test("returns free when subscription is missing", () => {
		expect(effectivePlanIdFromStatus(undefined, now)).toBe("free");
	});

	test("keeps paid plan for active/trialing", () => {
		expect(
			effectivePlanIdFromStatus({ planId: "teams", status: "active" }, now),
		).toBe("teams");
		expect(
			effectivePlanIdFromStatus(
				{ planId: "teams_pro", status: "trialing" },
				now,
			),
		).toBe("teams_pro");
	});

	test("keeps plan during cancel-at-period-end until period end", () => {
		expect(
			effectivePlanIdFromStatus(
				{
					planId: "teams",
					status: "canceled",
					cancelAtPeriodEnd: true,
					periodEnd: new Date("2026-06-15T00:00:00.000Z"),
				},
				now,
			),
		).toBe("teams");
	});

	test("downgrades after cancel-at-period-end window", () => {
		expect(
			effectivePlanIdFromStatus(
				{
					planId: "teams",
					status: "canceled",
					cancelAtPeriodEnd: true,
					periodEnd: new Date("2026-05-15T00:00:00.000Z"),
				},
				now,
			),
		).toBe("free");
	});

	test("keeps plan while past_due (payment retry window)", () => {
		expect(
			effectivePlanIdFromStatus({ planId: "teams", status: "past_due" }, now),
		).toBe("teams");
	});

	test("downgrades incomplete subscriptions", () => {
		expect(
			effectivePlanIdFromStatus({ planId: "teams", status: "incomplete" }, now),
		).toBe("free");
	});
});

describe("recipientSlotCounts", () => {
	test("sums warm participants and cold invites", async () => {
		const { recipientSlotCounts } = await import(
			"@/lib/domains/entitlements/recipient-slots"
		);
		const counts = recipientSlotCounts({
			participants: [{ isSigner: true }, { isSigner: false }],
			coldInvites: [{ isSigner: true }],
		});
		expect(counts.warmParticipantCount).toBe(2);
		expect(counts.coldInviteCount).toBe(1);
		expect(counts.recipientSlotCount).toBe(3);
	});
});
