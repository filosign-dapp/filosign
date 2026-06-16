import { describe, expect, test } from "bun:test";
import { settlementStatusLabelForCompliance } from "../utils/settlement-legal";

describe("settlementStatusLabelForCompliance", () => {
	test("pending before envelope complete", () => {
		expect(
			settlementStatusLabelForCompliance("pending", {
				envelopeSigningComplete: false,
			}),
		).toBe("Waiting for signatures");
	});

	test("pending after envelope complete", () => {
		expect(
			settlementStatusLabelForCompliance("pending", {
				envelopeSigningComplete: true,
			}),
		).toBe("Payout processing");
	});

	test("ready after envelope complete", () => {
		expect(
			settlementStatusLabelForCompliance("ready", {
				envelopeSigningComplete: true,
			}),
		).toBe("Payout processing");
	});
});
