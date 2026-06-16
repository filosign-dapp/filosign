import { describe, expect, test } from "bun:test";
import { waitingForMoreSigners } from "@/lib/domains/files/utils/envelope-waiting";
import type { EnvelopeRegistryProgress } from "@/lib/domains/files/utils/piece-helpers";

function progress(
	partial: Pick<
		EnvelopeRegistryProgress,
		| "requiredSignersCount"
		| "requiredSignaturesCount"
		| "quorumN"
		| "completedAt"
	>,
): EnvelopeRegistryProgress {
	return {
		routingMode: 0,
		revokedBeforeCompletedAt: null,
		revokedBy: null,
		nextSignerEmail: null,
		routingOrderEmails: null,
		canSignByRouting: true,
		...partial,
	};
}

describe("waitingForMoreSigners", () => {
	test("returns false when envelope is complete", () => {
		expect(
			waitingForMoreSigners(
				progress({
					requiredSignersCount: 2,
					requiredSignaturesCount: 2,
					quorumN: 0,
					completedAt: 1,
				}),
			),
		).toBe(false);
	});

	test("returns true when signatures are below required signers", () => {
		expect(
			waitingForMoreSigners(
				progress({
					requiredSignersCount: 2,
					requiredSignaturesCount: 1,
					quorumN: 0,
					completedAt: null,
				}),
			),
		).toBe(true);
	});

	test("uses quorumN when set", () => {
		expect(
			waitingForMoreSigners(
				progress({
					requiredSignersCount: 5,
					requiredSignaturesCount: 2,
					quorumN: 3,
					completedAt: null,
				}),
			),
		).toBe(true);
		expect(
			waitingForMoreSigners(
				progress({
					requiredSignersCount: 5,
					requiredSignaturesCount: 3,
					quorumN: 3,
					completedAt: null,
				}),
			),
		).toBe(false);
	});
});
