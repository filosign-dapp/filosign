import type {
	WorkflowProgressDisplay,
	WorkflowProgressState,
	WorkflowProgressStep,
} from "@/src/lib/domains/workflow-progress/types";

export function createInitialWorkflowProgressState(
	steps: WorkflowProgressStep[],
): WorkflowProgressState {
	return {
		steps,
		activeStepId: steps[0]?.id ?? null,
		completedStepIds: [],
		status: "running",
	};
}

export function nextWorkflowStepId(
	steps: WorkflowProgressStep[],
	completedStepIds: string[],
): string | null {
	for (const step of steps) {
		if (!completedStepIds.includes(step.id)) return step.id;
	}
	return null;
}

export function completeWorkflowStep(
	state: WorkflowProgressState,
	stepId: string,
): WorkflowProgressState {
	if (state.completedStepIds.includes(stepId)) return state;
	const completedStepIds = [...state.completedStepIds, stepId];
	return {
		...state,
		completedStepIds,
		activeStepId: nextWorkflowStepId(state.steps, completedStepIds),
	};
}

export function activateWorkflowStep(
	state: WorkflowProgressState,
	stepId: string,
): WorkflowProgressState {
	if (!state.steps.some((step) => step.id === stepId)) return state;
	return { ...state, activeStepId: stepId };
}

export function markWorkflowProgressSuccess(
	state: WorkflowProgressState,
): WorkflowProgressState {
	const completedStepIds = state.steps.map((step) => step.id);
	return {
		...state,
		completedStepIds,
		activeStepId: null,
		status: "success",
	};
}

export function getActiveWorkflowProgressDisplay(
	state: WorkflowProgressState,
	options: { fallbackLabel: string; errorFallbackLabel?: string },
): WorkflowProgressDisplay {
	if (state.status === "error" && state.error) {
		const failedStep = state.steps.find(
			(step) => step.id === state.error?.stepId,
		);
		return {
			label:
				failedStep?.label ??
				options.errorFallbackLabel ??
				options.fallbackLabel,
			detail: state.error.message,
			isError: true,
		};
	}

	const activeStep = state.activeStepId
		? state.steps.find((step) => step.id === state.activeStepId)
		: undefined;
	if (activeStep) {
		return {
			label: activeStep.label,
			detail: activeStep.detail,
			isError: false,
		};
	}

	const nextStep = state.steps.find(
		(step) => !state.completedStepIds.includes(step.id),
	);
	if (nextStep) {
		return {
			label: nextStep.label,
			detail: nextStep.detail,
			isError: false,
		};
	}

	return {
		label: options.fallbackLabel,
		isError: false,
	};
}

export type WorkflowProgressFailureEvent = {
	status: "error";
	errorMessage?: string;
};

export function workflowProgressFailureState(
	state: WorkflowProgressState,
	args: {
		stepId: string;
		message: string;
	},
): WorkflowProgressState {
	return {
		...state,
		status: "error",
		error: { stepId: args.stepId, message: args.message },
	};
}
