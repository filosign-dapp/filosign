import { describe, expect, test } from "bun:test";
import { effectivePlanIdFromStatus } from "./effective-plan";

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
