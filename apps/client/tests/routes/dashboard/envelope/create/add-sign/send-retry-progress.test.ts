import { describe, expect, test } from "bun:test";
import { buildRetrySendProgressPlan } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/progress";

describe("buildRetrySendProgressPlan", () => {
	test("includes only failed satellite steps", () => {
		const plan = buildRetrySendProgressPlan({
			createForm: {
				settlementDrafts: [{ legs: [] }],
				payoutPayerSource: "sender",
			} as never,
			incompleteSteps: ["payout_registration"],
			signatureFields: [],
			selfProfile: undefined,
		});

		const stepIds = plan.map((step) => step.id);
		expect(stepIds).not.toContain("encrypting");
		expect(stepIds).not.toContain("registering_envelope");
		expect(stepIds).toContain("payout_0_approve");
		expect(stepIds).toContain("indexing_payout");
	});

	test("attachment-only retry omits payout steps", () => {
		const plan = buildRetrySendProgressPlan({
			createForm: {
				settlementDrafts: [{ legs: [] }],
			} as never,
			incompleteSteps: ["attachment_rule"],
			signatureFields: [],
			selfProfile: undefined,
		});

		const stepIds = plan.map((step) => step.id);
		expect(stepIds).toEqual(["wallet_attachment_rule"]);
	});

	test("self_sign retry includes signing step when eligible", () => {
		const plan = buildRetrySendProgressPlan({
			createForm: {
				recipients: [
					{
						email: "me@example.com",
						role: "signer",
						walletAddress: "0x1111111111111111111111111111111111111111",
					},
				],
			} as never,
			incompleteSteps: ["self_sign"],
			signatureFields: [
				{
					id: "f1",
					assignedSignerEmail: "me@example.com",
					type: "signature",
				},
			] as never,
			selfProfile: {
				email: "me@example.com",
			} as never,
		});

		expect(plan.map((step) => step.id)).toContain("self_sign");
	});
});
