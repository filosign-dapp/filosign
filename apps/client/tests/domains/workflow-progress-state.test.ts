import { describe, expect, test } from "bun:test";
import {
	activateWorkflowStep,
	completeWorkflowStep,
	createInitialWorkflowProgressState,
	getActiveWorkflowProgressDisplay,
	markWorkflowProgressSuccess,
	workflowProgressFailureState,
} from "@/src/lib/domains/workflow-progress";

describe("workflow progress state", () => {
	const steps = [
		{ id: "step_a", label: "Step A" },
		{ id: "step_b", label: "Step B", detail: "Detail B" },
	];

	test("createInitialWorkflowProgressState activates the first step", () => {
		expect(createInitialWorkflowProgressState(steps)).toEqual({
			steps,
			activeStepId: "step_a",
			completedStepIds: [],
			status: "running",
		});
	});

	test("getActiveWorkflowProgressDisplay returns the active step label", () => {
		const state = createInitialWorkflowProgressState(steps);
		expect(
			getActiveWorkflowProgressDisplay(state, {
				fallbackLabel: "Working",
			}),
		).toEqual({
			label: "Step A",
			isError: false,
		});
	});

	test("getActiveWorkflowProgressDisplay surfaces error detail", () => {
		const state = workflowProgressFailureState(
			createInitialWorkflowProgressState(steps),
			{
				stepId: "step_b",
				message: "Wallet rejected",
			},
		);
		expect(
			getActiveWorkflowProgressDisplay(state, {
				fallbackLabel: "Working",
				errorFallbackLabel: "Failed",
			}),
		).toEqual({
			label: "Step B",
			detail: "Wallet rejected",
			isError: true,
		});
	});

	test("markWorkflowProgressSuccess completes every step", () => {
		const state = markWorkflowProgressSuccess(
			createInitialWorkflowProgressState(steps),
		);
		expect(state.status).toBe("success");
		expect(state.completedStepIds).toEqual(["step_a", "step_b"]);
		expect(state.activeStepId).toBeNull();
	});

	test("activate and complete advance the active step", () => {
		let state = createInitialWorkflowProgressState(steps);
		state = completeWorkflowStep(state, "step_a");
		expect(state.activeStepId).toBe("step_b");
		state = activateWorkflowStep(state, "step_b");
		expect(state.activeStepId).toBe("step_b");
	});
});
