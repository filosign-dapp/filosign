import { describe, expect, test } from "bun:test";
import type { SettlementReleaseType } from "../utils/settlement-rules";
import {
	canSettlementReleaseBeforeEnvelopeComplete,
	isCompletionGatedSettlementExpiry,
} from "../utils/settlement-rules";

describe("isCompletionGatedSettlementExpiry", () => {
	test("completion-gated release types", () => {
		for (const releaseType of [
			"all_signed",
			"all_required_signed",
			"all_signed_complete",
		] satisfies SettlementReleaseType[]) {
			expect(isCompletionGatedSettlementExpiry(releaseType)).toBe(true);
		}
	});

	test("progress-gated release types", () => {
		for (const releaseType of [
			"specific_signer",
			"at_least_n",
			"quorum_required",
			"quorum_set",
			"quorum_all",
			"all_of_set",
		] satisfies SettlementReleaseType[]) {
			expect(isCompletionGatedSettlementExpiry(releaseType)).toBe(false);
		}
	});
});

describe("canSettlementReleaseBeforeEnvelopeComplete", () => {
	test("early release types", () => {
		for (const releaseType of [
			"specific_signer",
			"at_least_n",
			"quorum_all",
			"quorum_set",
			"all_of_set",
		] satisfies SettlementReleaseType[]) {
			expect(canSettlementReleaseBeforeEnvelopeComplete(releaseType)).toBe(
				true,
			);
		}
	});

	test("completion-gated release types", () => {
		for (const releaseType of [
			"all_signed",
			"all_required_signed",
			"all_signed_complete",
			"quorum_required",
		] satisfies SettlementReleaseType[]) {
			expect(canSettlementReleaseBeforeEnvelopeComplete(releaseType)).toBe(
				false,
			);
		}
	});
});
