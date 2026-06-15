import { describe, expect, test } from "bun:test";
import {
	buildSignProgressPlan,
	createInitialSignProgressState,
	reduceSignProgress,
} from "@/src/routes/dashboard/document/sign/-lib/utils/sign/progress";

describe("sign progress", () => {
	test("buildSignProgressPlan includes optional client steps", () => {
		expect(
			buildSignProgressPlan({
				needsAcknowledge: true,
				needsPrepareFields: true,
			}).map((step) => step.id),
		).toEqual([
			"acknowledging",
			"preparing_fields",
			"loading_document",
			"preparing_signature",
			"crypto_sign",
			"wallet_sign",
			"submitting_signature",
		]);
	});

	test("buildSignProgressPlan omits optional client steps", () => {
		expect(
			buildSignProgressPlan({
				needsAcknowledge: false,
				needsPrepareFields: false,
			}).map((step) => step.id),
		).toEqual([
			"loading_document",
			"preparing_signature",
			"crypto_sign",
			"wallet_sign",
			"submitting_signature",
		]);
	});

	test("reduceSignProgress advances through SDK wallet and submit phases", () => {
		let state = createInitialSignProgressState(
			buildSignProgressPlan({
				needsAcknowledge: false,
				needsPrepareFields: false,
			}),
		);

		state = reduceSignProgress(state, {
			phase: "loading_document",
			status: "start",
		});
		state = reduceSignProgress(state, {
			phase: "loading_document",
			status: "done",
		});
		state = reduceSignProgress(state, {
			phase: "wallet_sign",
			status: "wallet_prompt",
		});
		state = reduceSignProgress(state, {
			phase: "wallet_sign",
			status: "done",
		});
		state = reduceSignProgress(state, {
			phase: "submitting_signature",
			status: "done",
		});

		expect(state.status).toBe("success");
		expect(state.completedStepIds).toContain("wallet_sign");
		expect(state.completedStepIds).toContain("submitting_signature");
	});

	test("reduceSignProgress records sign_failed errors", () => {
		const state = reduceSignProgress(
			createInitialSignProgressState(
				buildSignProgressPlan({
					needsAcknowledge: false,
					needsPrepareFields: false,
				}),
			),
			{
				phase: "sign_failed",
				status: "error",
				errorMessage: "Wallet rejected",
			},
		);

		expect(state.status).toBe("error");
		expect(state.error?.message).toBe("Wallet rejected");
	});
});
