import type { SignProgressEvent as SdkSignProgressEvent } from "@filosign/react/files";
import type {
	WorkflowProgressState,
	WorkflowProgressStep,
} from "@/src/lib/domains/workflow-progress";
import {
	activateWorkflowStep,
	completeWorkflowStep,
	createInitialWorkflowProgressState,
	getActiveWorkflowProgressDisplay,
	markWorkflowProgressSuccess,
	workflowProgressFailureState,
} from "@/src/lib/domains/workflow-progress";

export type {
	WorkflowProgressState as SignProgressState,
	WorkflowProgressStep as SignProgressStep,
} from "@/src/lib/domains/workflow-progress";

export type ClientSignProgressPhase = "acknowledging" | "preparing_fields";

export type SignProgressEvent =
	| SdkSignProgressEvent
	| {
			phase: ClientSignProgressPhase;
			status: "start" | "done" | "error";
			errorMessage?: string;
	  };

export const createInitialSignProgressState =
	createInitialWorkflowProgressState;
export const markSignProgressSuccess = markWorkflowProgressSuccess;

export function getActiveSignProgressDisplay(state: WorkflowProgressState) {
	return getActiveWorkflowProgressDisplay(state, {
		fallbackLabel: "Signing envelope",
		errorFallbackLabel: "Could not sign envelope",
	});
}

export function buildSignProgressPlan(args: {
	needsAcknowledge: boolean;
	needsPrepareFields: boolean;
}): WorkflowProgressStep[] {
	const steps: WorkflowProgressStep[] = [];

	if (args.needsAcknowledge) {
		steps.push({
			id: "acknowledging",
			label: "Acknowledging document",
		});
	}

	if (args.needsPrepareFields) {
		steps.push({
			id: "preparing_fields",
			label: "Preparing your fields",
		});
	}

	steps.push(
		{ id: "loading_document", label: "Loading document" },
		{ id: "preparing_signature", label: "Preparing signature" },
		{ id: "crypto_sign", label: "Creating cryptographic signature" },
		{ id: "wallet_sign", label: "Confirm in wallet" },
		{ id: "submitting_signature", label: "Submitting signature" },
	);

	return steps;
}

function resolveStepForEvent(event: SignProgressEvent): string | null {
	if (event.phase === "acknowledging") return "acknowledging";
	if (event.phase === "preparing_fields") return "preparing_fields";
	if (event.phase === "loading_document") return "loading_document";
	if (event.phase === "preparing_signature") return "preparing_signature";
	if (event.phase === "crypto_sign") return "crypto_sign";
	if (event.phase === "wallet_sign") return "wallet_sign";
	if (event.phase === "submitting_signature") return "submitting_signature";
	if (event.phase === "sign_failed") return null;
	return null;
}

export function reduceSignProgress(
	state: WorkflowProgressState,
	event: SignProgressEvent,
): WorkflowProgressState {
	if (state.status === "success") return state;

	const stepId = resolveStepForEvent(event);
	if (event.phase === "sign_failed") {
		const message =
			"errorMessage" in event && event.errorMessage
				? event.errorMessage
				: "Something went wrong while signing.";
		return workflowProgressFailureState(state, {
			stepId: state.activeStepId ?? state.steps[0]?.id ?? "sign_failed",
			message,
		});
	}

	if (!stepId) return state;

	if (event.status === "error") {
		const message =
			"errorMessage" in event && event.errorMessage
				? event.errorMessage
				: "Something went wrong while signing.";
		return workflowProgressFailureState(state, { stepId, message });
	}

	if (event.status === "start" || event.status === "wallet_prompt") {
		return activateWorkflowStep(state, stepId);
	}

	if (event.status === "done") {
		const next = completeWorkflowStep(state, stepId);
		if (event.phase === "submitting_signature") {
			return { ...next, status: "success", activeStepId: null };
		}
		return next;
	}

	return state;
}
