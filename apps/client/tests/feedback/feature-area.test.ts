import { describe, expect, test } from "bun:test";
import { feedbackFeatureAreaFromPath } from "@/src/lib/feedback/feature-area";

describe("feedbackFeatureAreaFromPath", () => {
	test("maps envelope routes to send", () => {
		expect(
			feedbackFeatureAreaFromPath("/dashboard/envelope/create/add-sign"),
		).toBe("send");
	});

	test("maps sign routes to sign", () => {
		expect(feedbackFeatureAreaFromPath("/dashboard/document/sign")).toBe(
			"sign",
		);
	});

	test("maps settlement routes to payouts", () => {
		expect(
			feedbackFeatureAreaFromPath("/dashboard/settings/workspace/settlement"),
		).toBe("payouts");
	});

	test("maps workspace settings to workspace", () => {
		expect(feedbackFeatureAreaFromPath("/dashboard/settings/workspace")).toBe(
			"workspace",
		);
	});
});
