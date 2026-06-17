import type { SettlementChangeProgressEvent } from "@filosign/react/files";
import {
	activateWorkflowStep,
	completeWorkflowStep,
	createInitialWorkflowProgressState,
	markWorkflowProgressSuccess,
	type WorkflowProgressState,
	type WorkflowProgressStep,
	workflowProgressFailureState,
} from "@/src/lib/domains/workflow-progress";
import type { SettlementAllowanceChangeStep } from "../utils/allowance";

export type SettlementChangeMode = "update" | "cancel";

export type SettlementChangeProgressState = WorkflowProgressState;

export type SettlementChangeProgressReporter = (
	event: SettlementChangeProgressEvent,
) => void;

const CONFIRM_SUFFIX = "_confirm" as const;

function confirmStepId(phase: SettlementChangeProgressEvent["phase"]): string {
	return `${phase}${CONFIRM_SUFFIX}`;
}

function stepIdForPhase(
	phase: SettlementChangeProgressEvent["phase"],
	status: SettlementChangeProgressEvent["status"],
): string | null {
	if (status === "start") return phase;
	if (status === "confirming" || status === "done") {
		return confirmStepId(phase);
	}
	return null;
}

function approvalSyncSteps(): WorkflowProgressStep[] {
	return [
		{ id: "sync_approval", label: "Syncing USDC approval" },
		{ id: "sync_approval_confirm", label: "Confirming approval" },
	];
}

export function buildSettlementUpdateProgressPlan(
	changeStep: SettlementAllowanceChangeStep,
): WorkflowProgressStep[] {
	const steps: WorkflowProgressStep[] = [];

	if (changeStep === "increase" || changeStep === "unknown") {
		steps.push(
			{ id: "approve", label: "Approving USDC" },
			{ id: "approve_confirm", label: "Confirming approval" },
		);
	}

	steps.push(
		{ id: "update", label: "Updating payout" },
		{ id: "update_confirm", label: "Confirming update" },
	);

	if (changeStep === "trim") {
		steps.push(...approvalSyncSteps());
	}

	return steps;
}

export function buildSettlementCancelProgressPlan(): WorkflowProgressStep[] {
	return [
		{ id: "cancel", label: "Removing payout" },
		{ id: "cancel_confirm", label: "Confirming removal" },
		...approvalSyncSteps(),
	];
}

export function createInitialSettlementChangeProgressState(
	steps: WorkflowProgressStep[],
): SettlementChangeProgressState {
	return createInitialWorkflowProgressState(steps);
}

export function markSettlementChangeProgressSuccess(
	state: SettlementChangeProgressState,
): SettlementChangeProgressState {
	return markWorkflowProgressSuccess(state);
}

export function reduceSettlementChangeProgress(
	state: SettlementChangeProgressState,
	event: SettlementChangeProgressEvent,
): SettlementChangeProgressState {
	const stepId = stepIdForPhase(event.phase, event.status);
	if (!stepId) return state;

	if (event.status === "start") {
		return activateWorkflowStep(state, stepId);
	}

	if (event.status === "confirming") {
		return activateWorkflowStep(
			completeWorkflowStep(state, event.phase),
			stepId,
		);
	}

	let next = completeWorkflowStep(state, stepId);
	if (!next.completedStepIds.includes(event.phase)) {
		next = completeWorkflowStep(next, event.phase);
	}
	return next;
}

export function settlementChangeProgressFailureState(
	state: SettlementChangeProgressState,
	message: string,
): SettlementChangeProgressState {
	return workflowProgressFailureState(state, {
		stepId: state.activeStepId ?? state.steps[0]?.id ?? "update",
		message,
	});
}
