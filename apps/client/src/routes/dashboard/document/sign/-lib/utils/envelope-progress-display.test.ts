import { describe, expect, test } from "bun:test";
import {
	buildEnvelopeProgressLines,
	envelopeProgressPercent,
	envelopeProgressTotals,
} from "./envelope-progress-display";

const base = {
	routingMode: 0,
	requiredSignersCount: 2,
	requiredSignaturesCount: 1,
	optionalSignersCount: 0,
	optionalSignaturesCount: 0,
	quorumN: 0,
	allRequiredSigned: false,
	allSigned: false,
	quorumMet: false,
	nextSignerEmail: null as string | null,
};

describe("envelopeProgressTotals", () => {
	test("sums required and optional counts", () => {
		expect(
			envelopeProgressTotals({
				...base,
				requiredSignersCount: 2,
				requiredSignaturesCount: 1,
				optionalSignersCount: 1,
				optionalSignaturesCount: 0,
			}),
		).toEqual({ signedCount: 1, totalSigners: 3 });
	});
});

describe("envelopeProgressPercent", () => {
	test("returns 0 when no signers", () => {
		expect(envelopeProgressPercent(0, 0)).toBe(0);
	});

	test("rounds to whole percent capped at 100", () => {
		expect(envelopeProgressPercent(1, 2)).toBe(50);
	});
});

describe("buildEnvelopeProgressLines", () => {
	test("sequential: combines count and next signer", () => {
		const lines = buildEnvelopeProgressLines(
			{
				...base,
				routingMode: 1,
				nextSignerEmail: "alice@example.com",
			},
			true,
		);
		expect(lines).toEqual([
			"1 of 2 signers have signed. alice@example.com is next.",
		]);
	});

	test("sequential: waiting for prior signers", () => {
		const lines = buildEnvelopeProgressLines(
			{
				...base,
				routingMode: 1,
				nextSignerEmail: "alice@example.com",
			},
			false,
		);
		expect(lines[0]).toContain("1 of 2 signers have signed.");
		expect(lines[0]).toContain("ahead of you");
	});
});
