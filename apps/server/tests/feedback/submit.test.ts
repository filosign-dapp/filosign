import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Address } from "viem";

const notifyFeedbackSubmitted = mock(async () => {});

mock.module("@/lib/domains/feedback/notify", () => ({
	notifyFeedbackSubmitted,
}));

const insertValues = mock(async () => {});
const selectLimit = mock(async () => [] as { id: string }[]);

mock.module("@/lib/platform/db", () => ({
	default: {
		select: () => ({
			from: () => ({
				where: () => ({
					limit: selectLimit,
				}),
			}),
		}),
		insert: () => ({
			values: insertValues,
		}),
	},
}));

const { submitProductFeedback } = await import("@/lib/domains/feedback/submit");

describe("submitProductFeedback", () => {
	beforeEach(() => {
		notifyFeedbackSubmitted.mockClear();
		insertValues.mockClear();
		selectLimit.mockReset();
		selectLimit.mockResolvedValue([]);
	});

	test("stores feedback and notifies telegram", async () => {
		const wallet = "0x1111111111111111111111111111111111111111" as Address;

		const result = await submitProductFeedback({
			walletAddress: wallet,
			organizationId: null,
			featureArea: "send",
			route: "/dashboard/envelope/create/add-sign",
			rating: 5,
			message: "Smooth send flow",
			pieceCid: null,
			promptType: "contextual",
			trigger: "first_envelope_sent",
			metadata: {},
		});

		expect(result.ok).toBe(true);
		expect(insertValues).toHaveBeenCalledTimes(1);
		expect(notifyFeedbackSubmitted).toHaveBeenCalledTimes(1);
	});
});
