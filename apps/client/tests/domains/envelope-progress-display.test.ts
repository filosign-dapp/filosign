import { describe, expect, test } from "bun:test";
import {
	type EnvelopeProgressLike,
	isEnvelopeVoided,
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
