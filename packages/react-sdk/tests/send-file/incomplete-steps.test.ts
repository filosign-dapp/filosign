import { describe, expect, test } from "bun:test";
import {
	filterPostRegisterSatelliteSteps,
	isPostRegisterSatelliteStep,
	mergeSendFileIncompleteSteps,
} from "../../src/lib/send-file/incomplete-steps";

describe("send-file incomplete step helpers", () => {
	test("filterPostRegisterSatelliteSteps keeps attachment and payout only", () => {
		expect(
			filterPostRegisterSatelliteSteps([
				"attachment_rule",
				"payout_registration",
				"self_sign",
			]),
		).toEqual(["attachment_rule", "payout_registration"]);
	});

	test("isPostRegisterSatelliteStep excludes self_sign", () => {
		expect(isPostRegisterSatelliteStep("self_sign")).toBe(false);
		expect(isPostRegisterSatelliteStep("attachment_rule")).toBe(true);
	});

	test("mergeSendFileIncompleteSteps deduplicates across groups", () => {
		expect(
			mergeSendFileIncompleteSteps(
				["attachment_rule"],
				["attachment_rule", "self_sign"],
				undefined,
				["payout_registration"],
			),
		).toEqual(["attachment_rule", "self_sign", "payout_registration"]);
	});
});
