import { describe, expect, test } from "bun:test";
import { retryIncompleteSendSteps } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/retry-incomplete-steps";
import type { SendSession } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/session";

const session: SendSession = {
	pieceCid: "bafyabc",
	incompleteSteps: ["attachment_rule", "self_sign"],
	postSendPayload: {
		cidIdentifier: `0x${"ab".repeat(32)}`,
		attachmentPacketDrafts: [],
		attachmentPackets: [],
		settlementRules: [],
	},
};

describe("retryIncompleteSendSteps", () => {
	test("retries satellites then self-sign and drops completed steps", async () => {
		const satelliteCalls: string[][] = [];

		const remaining = await retryIncompleteSendSteps({
			session,
			retrySatellites: async (input) => {
				satelliteCalls.push([...input.incompleteSteps]);
				return { incompleteSteps: [] };
			},
			retrySelfSign: async () => ({ attempted: true, ok: true }),
		});

		expect(satelliteCalls).toEqual([["attachment_rule"]]);
		expect(remaining).toEqual([]);
	});

	test("keeps self_sign when retry fails", async () => {
		const remaining = await retryIncompleteSendSteps({
			session: { ...session, incompleteSteps: ["self_sign"] },
			retrySatellites: async () => ({ incompleteSteps: [] }),
			retrySelfSign: async () => ({ attempted: true, ok: false }),
		});

		expect(remaining).toEqual(["self_sign"]);
	});

	test("updates satellite failures without dropping self_sign", async () => {
		const remaining = await retryIncompleteSendSteps({
			session: {
				...session,
				incompleteSteps: ["payout_registration", "self_sign"],
			},
			retrySatellites: async () => ({
				incompleteSteps: ["payout_registration"],
			}),
			retrySelfSign: async () => ({ attempted: false }),
		});

		expect(remaining).toEqual(["payout_registration", "self_sign"]);
	});
});
