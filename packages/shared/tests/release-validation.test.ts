import { describe, expect, test } from "bun:test";
import {
	releaseTypeHidesThresholdInput,
	resolveReleaseParamsForRouting,
	validateReleaseParamsForRouting,
} from "../utils/release-validation";

const routing = {
	quorumN: 3,
	signerCount: 4,
	requiredSignerCount: 4,
};

describe("resolveReleaseParamsForRouting", () => {
	test("quorum_required auto-resolves threshold from quorumN", () => {
		const params = resolveReleaseParamsForRouting({
			releaseType: "quorum_required",
			thresholdN: "2",
			routing,
		});
		expect(params).toEqual({ releaseType: "quorum_required", thresholdN: 3 });
	});
});

describe("validateReleaseParamsForRouting", () => {
	test("rejects quorum_required threshold mismatch", () => {
		const result = validateReleaseParamsForRouting({
			releaseType: "quorum_required",
			thresholdN: "2",
			routing,
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.issue).toBe("quorum_threshold_mismatch");
		}
	});

	test("accepts quorum_required when threshold matches", () => {
		const result = validateReleaseParamsForRouting({
			releaseType: "quorum_required",
			thresholdN: "3",
			routing,
		});
		expect(result.ok).toBe(true);
	});

	test("accepts at_least_n with threshold only (compose dialog path)", () => {
		const result = validateReleaseParamsForRouting({
			releaseType: "at_least_n",
			thresholdN: "3",
			routing,
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.params).toEqual({
				releaseType: "at_least_n",
				thresholdN: 3,
			});
		}
	});

	test("accepts quorum_set with threshold only (compose dialog path)", () => {
		const result = validateReleaseParamsForRouting({
			releaseType: "quorum_set",
			thresholdN: "3",
			routing,
		});
		expect(result.ok).toBe(true);
	});

	test("resolveReleaseParamsForRouting returns threshold for at_least_n", () => {
		const params = resolveReleaseParamsForRouting({
			releaseType: "at_least_n",
			thresholdN: "3",
			routing,
		});
		expect(params).toEqual({ releaseType: "at_least_n", thresholdN: 3 });
	});
});

describe("releaseTypeHidesThresholdInput", () => {
	test("hides for quorum_required with envelope minimum", () => {
		expect(
			releaseTypeHidesThresholdInput("quorum_required", {
				quorumN: 3,
				signerCount: 4,
			}),
		).toBe(true);
	});
});
