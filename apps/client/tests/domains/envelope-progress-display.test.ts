import { describe, expect, test } from "bun:test";
import {
	buildEnvelopeProgressContextLines,
	type EnvelopeProgressLike,
	envelopeProgressPercent,
	envelopeProgressTotals,
	isEnvelopeVoided,
	resolveSignHeaderStatus,
	signerStatusLabel,
} from "@/src/routes/dashboard/document/sign/-lib/utils/envelope-progress-display";

const baseProgress: EnvelopeProgressLike = {
	routingMode: 0,
	requiredSignersCount: 2,
	requiredSignaturesCount: 0,
	quorumN: 0,
	nextSignerEmail: null,
};

describe("isEnvelopeVoided", () => {
	test("returns true when revokedBeforeCompletedAt is set", () => {
		expect(
			isEnvelopeVoided({
				...baseProgress,
				revokedBeforeCompletedAt: 1_700_000_000,
			}),
		).toBe(true);
	});

	test("returns false for active envelopes", () => {
		expect(isEnvelopeVoided(baseProgress)).toBe(false);
		expect(isEnvelopeVoided(null)).toBe(false);
	});
});

describe("envelopeProgressTotals", () => {
	test("uses quorumN as target when quorum signing is enabled", () => {
		expect(
			envelopeProgressTotals({
				...baseProgress,
				requiredSignersCount: 5,
				requiredSignaturesCount: 2,
				quorumN: 2,
			}),
		).toEqual({ signedCount: 2, totalSigners: 2 });
	});

	test("uses requiredSignersCount when quorum is disabled", () => {
		expect(
			envelopeProgressTotals({
				...baseProgress,
				requiredSignersCount: 3,
				requiredSignaturesCount: 1,
				quorumN: 0,
			}),
		).toEqual({ signedCount: 1, totalSigners: 3 });
	});
});

describe("envelopeProgressPercent", () => {
	test("returns 100 when envelope is complete", () => {
		expect(envelopeProgressPercent(1, 5, true)).toBe(100);
	});

	test("computes quorum progress before completion", () => {
		expect(envelopeProgressPercent(1, 2, false)).toBe(50);
	});
});

describe("buildEnvelopeProgressContextLines", () => {
	test("notes quorum met when complete before all signers signed", () => {
		const lines = buildEnvelopeProgressContextLines({
			...baseProgress,
			requiredSignersCount: 5,
			requiredSignaturesCount: 2,
			quorumN: 2,
			completedAt: 1_700_000_000,
		});

		expect(lines).toContain("This envelope is complete on-chain.");
		expect(lines).toContain("Quorum met; remaining signers were not required.");
	});
});

describe("signerStatusLabel", () => {
	test('returns "Not required" for unsigned signers when envelope is complete', () => {
		expect(
			signerStatusLabel({
				hasSigned: false,
				isReplacementOld: false,
				isReplacementNew: false,
				invitePending: false,
				isUpNext: false,
				isSequential: false,
				envelopeComplete: true,
			}),
		).toBe("Not required");
	});

	test('returns "Pending" for unsigned signers on an open envelope', () => {
		expect(
			signerStatusLabel({
				hasSigned: false,
				isReplacementOld: false,
				isReplacementNew: false,
				invitePending: false,
				isUpNext: false,
				isSequential: false,
				envelopeComplete: false,
			}),
		).toBe("Pending");
	});
});

describe("resolveSignHeaderStatus", () => {
	test('returns "Envelope complete" when quorum finished before user signed', () => {
		expect(
			resolveSignHeaderStatus({
				alreadySigned: false,
				canSign: false,
				hasPlacementFields: true,
				canSubmitPlacementSign: false,
				envelopeComplete: true,
			}),
		).toEqual({ label: "Envelope complete", dotClass: "bg-secondary" });
	});
});
