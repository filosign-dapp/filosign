import { describe, expect, it } from "bun:test";
import {
	buildEnvelopeProgressLines,
	envelopeProgressPercent,
	envelopeProgressTotals,
} from "./envelope-progress-display";

const base = {
	routingMode: 0,
	requiredSignersCount: 2,
	requiredSignaturesCount: 1,
	quorumN: 0,
	completedAt: null,
	revokedBeforeCompletedAt: null,
	revokedBy: null,
	nextSignerEmail: null,
};

describe("envelope-progress-display", () => {
	it("totals count required signatures", () => {
		expect(envelopeProgressTotals(base)).toEqual({
			signedCount: 1,
			totalSigners: 2,
		});
	});

	it("percent from totals", () => {
		expect(envelopeProgressPercent(1, 2)).toBe(50);
	});

	it("voided envelope shows void line only", () => {
		const lines = buildEnvelopeProgressLines({
			...base,
			revokedBeforeCompletedAt: 1,
		});
		expect(lines[0]).toContain("voided");
	});

	it("complete envelope shows complete line", () => {
		const lines = buildEnvelopeProgressLines({
			...base,
			completedAt: 1,
		});
		expect(lines[0]).toContain("complete");
	});
});
