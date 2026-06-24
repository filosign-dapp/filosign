import { describe, expect, test } from "bun:test";
import {
	composeDisplayReleaseType,
	envelopeMinimumRoutingNote,
	formatReleaseValidationError,
	quorumRequiredThresholdLockedHelper,
	settlementReleaseTypeDescription,
	settlementReleaseTypeLabel,
	settlementReleaseTypesForComposeAdvancedVisible,
} from "../utils/release-copy";

const quorumContext = { quorumN: 3, signerCount: 4 };

describe("settlementReleaseTypeLabel", () => {
	test("all_signed without quorum", () => {
		expect(settlementReleaseTypeLabel("all_signed")).toBe(
			"When signing is finished",
		);
	});

	test("all_signed with quorum context in description", () => {
		expect(
			settlementReleaseTypeDescription("all_signed", quorumContext),
		).toContain("3 of 4");
	});

	test("quorum_required with envelope minimum matches all_signed label", () => {
		expect(settlementReleaseTypeLabel("quorum_required", quorumContext)).toBe(
			"When signing is finished",
		);
	});

	test("at_least_n substitutes threshold in compose preview", () => {
		expect(
			settlementReleaseTypeLabel("at_least_n", undefined, { thresholdN: 3 }),
		).toBe("When 3 signers from your list sign");
	});

	test("quorum_all keeps N placeholder without threshold", () => {
		expect(settlementReleaseTypeLabel("quorum_all")).toBe(
			"When N people on the document sign",
		);
	});
});

describe("compose release selectors", () => {
	test("hides quorum_required when envelope minimum is set", () => {
		const visible =
			settlementReleaseTypesForComposeAdvancedVisible(quorumContext);
		expect(visible).not.toContain("quorum_required");
		expect(visible).toContain("at_least_n");
	});

	test("maps quorum_required to all_signed for display when minimum is set", () => {
		expect(composeDisplayReleaseType("quorum_required", quorumContext)).toBe(
			"all_signed",
		);
	});
});

describe("envelopeMinimumRoutingNote", () => {
	test("returns note when minimum is set", () => {
		expect(envelopeMinimumRoutingNote(quorumContext)).toContain("3 of 4");
	});

	test("null when no minimum", () => {
		expect(
			envelopeMinimumRoutingNote({ quorumN: 0, signerCount: 4 }),
		).toBeNull();
	});
});

describe("formatReleaseValidationError", () => {
	test("quorum mismatch message", () => {
		const msg = formatReleaseValidationError(
			"quorum_threshold_mismatch",
			quorumContext,
		);
		expect(msg).toContain("3");
		expect(msg).toContain("4");
	});
});

describe("quorumRequiredThresholdLockedHelper", () => {
	test("shows minimum", () => {
		expect(quorumRequiredThresholdLockedHelper(quorumContext)).toContain(
			"3 of 4",
		);
	});
});
