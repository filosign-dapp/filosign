import { describe, expect, test } from "bun:test";
import { pollRegistrationStatus } from "../../src/lib/send-file/poll-registration-status";

describe("pollRegistrationStatus", () => {
	test("returns immediately when status is registered", async () => {
		const calls: string[] = [];
		const result = await pollRegistrationStatus({
			pieceCid: "bafyabc",
			initialStatus: "registering",
			rpcQuery: {
				files: {
					registrationStatus: {
						call: async () => {
							calls.push("poll");
							return {
								registrationStatus: "registered" as const,
								registerError: null,
								onchainTxHash: `0x${"aa".repeat(32)}`,
							};
						},
					},
				},
			} as never,
			maxWaitMs: 5_000,
		});

		expect(result.registrationStatus).toBe("registered");
		expect(calls).toHaveLength(1);
	});
});
