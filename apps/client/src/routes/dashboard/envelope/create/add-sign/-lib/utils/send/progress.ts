import type { SendFileProgressEvent } from "@filosign/react/files";
import type { UserProfile } from "@filosign/react/users";
import type {
	CreateForm,
	SignatureField,
} from "@/src/lib/domains/files/envelope-form-types";
import type {
	SendProgressState,
	SendProgressStep,
} from "@/src/lib/domains/placement/types";
import { resolveSelfSignerOnRoster } from "@/src/lib/domains/placement/utils/self-signer";
import { selfAssignedFieldIds } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-assignees";

export type {
	SendProgressState,
	SendProgressStep,
} from "@/src/lib/domains/placement/types";

export type ClientSendProgressPhase =
	| "preparing_documents"
	| "resolving_payouts"
	| "building_payload"
	| "self_sign"
	| "send_failed";

export type SendProgressEvent =
	| SendFileProgressEvent
	| {
			phase: ClientSendProgressPhase;
			status: "start" | "done" | "error";
			errorMessage?: string;
	  };

function payoutApproveStepId(ruleIndex: number): string {
	return `payout_${ruleIndex}_approve`;
}

function payoutConfirmApproveStepId(ruleIndex: number): string {
	return `payout_${ruleIndex}_confirm_approve`;
}

function payoutRegisterStepId(ruleIndex: number): string {
	return `payout_${ruleIndex}_register`;
}

function payoutConfirmRegisterStepId(ruleIndex: number): string {
	return `payout_${ruleIndex}_confirm_register`;
}

function payoutDetail(
	ruleIndex: number,
	ruleCount: number,
): string | undefined {
	return ruleCount > 1 ? `Payout ${ruleIndex + 1} of ${ruleCount}` : undefined;
}

export function buildSendProgressPlan(args: {
	createForm: CreateForm;
	signatureFields: SignatureField[];
	selfProfile: UserProfile | undefined;
}): SendProgressStep[] {
	const steps: SendProgressStep[] = [
		{ id: "preparing_documents", label: "Preparing your documents" },
	];

	const settlementCount = args.createForm.settlementDrafts?.length ?? 0;
	if (settlementCount > 0) {
		steps.push({ id: "resolving_payouts", label: "Preparing payouts" });
	}

	steps.push(
		{ id: "building_payload", label: "Building your envelope" },
		{ id: "encrypting", label: "Encrypting your envelope" },
		{ id: "uploading", label: "Uploading your envelope" },
		{
			id: "wallet_sign_register",
			label: "Approve registration in your wallet",
		},
		{
			id: "registering_envelope",
			label: "Saving envelope to Filosign",
		},
	);

	const hasConditionalAttachments = (
		args.createForm.attachmentPacketDrafts ?? []
	).some((draft) => draft.releaseMode === "conditional");
	if (hasConditionalAttachments) {
		steps.push({
			id: "wallet_attachment_rule",
			label: "Approve attachment rules in your wallet",
		});
	}

	for (let ruleIndex = 0; ruleIndex < settlementCount; ruleIndex++) {
		const detail = payoutDetail(ruleIndex, settlementCount);
		steps.push(
			{
				id: payoutApproveStepId(ruleIndex),
				label: "Approve USDC in your wallet",
				detail,
			},
			{
				id: payoutConfirmApproveStepId(ruleIndex),
				label: "Waiting for confirmation",
				detail,
			},
			{
				id: payoutRegisterStepId(ruleIndex),
				label: "Registering payout on the network",
				detail,
			},
			{
				id: payoutConfirmRegisterStepId(ruleIndex),
				label: "Waiting for confirmation",
				detail,
			},
		);
	}

	if (settlementCount > 0) {
		steps.push({
			id: "indexing_payout",
			label: "Saving payout to Filosign",
		});
	}

	const selfOnRoster = resolveSelfSignerOnRoster(
		args.createForm.recipients ?? [],
		args.selfProfile,
	);
	if (
		selfOnRoster &&
		selfAssignedFieldIds(args.signatureFields, selfOnRoster.email).length > 0
	) {
		steps.push({ id: "self_sign", label: "Completing your signature fields" });
	}

	return steps;
}

export function createInitialSendProgressState(
	steps: SendProgressStep[],
): SendProgressState {
	return {
		steps,
		activeStepId: steps[0]?.id ?? null,
		completedStepIds: [],
		status: "running",
	};
}

function nextStepId(
	steps: SendProgressStep[],
	completedStepIds: string[],
): string | null {
	for (const step of steps) {
		if (!completedStepIds.includes(step.id)) return step.id;
	}
	return null;
}

function completeStep(
	state: SendProgressState,
	stepId: string,
): SendProgressState {
	if (state.completedStepIds.includes(stepId)) return state;
	const completedStepIds = [...state.completedStepIds, stepId];
	return {
		...state,
		completedStepIds,
		activeStepId: nextStepId(state.steps, completedStepIds),
	};
}

function activateStep(
	state: SendProgressState,
	stepId: string,
): SendProgressState {
	if (!state.steps.some((step) => step.id === stepId)) return state;
	return { ...state, activeStepId: stepId };
}

function resolveStepForEvent(event: SendProgressEvent): string | null {
	if (event.phase === "preparing_documents") return "preparing_documents";
	if (event.phase === "resolving_payouts") return "resolving_payouts";
	if (event.phase === "building_payload") return "building_payload";
	if (event.phase === "encrypting") return "encrypting";
	if (event.phase === "uploading") return "uploading";
	if (event.phase === "wallet_sign_register") return "wallet_sign_register";
	if (event.phase === "registering_envelope") return "registering_envelope";
	if (event.phase === "processing_attachments") return "wallet_attachment_rule";
	if (event.phase === "wallet_attachment_rule") return "wallet_attachment_rule";
	if (event.phase === "indexing_payout") return "indexing_payout";
	if (event.phase === "self_sign") return "self_sign";
	if (event.phase === "send_failed") return null;

	if (event.phase === "wallet_payout_approve") {
		const ruleIndex = event.ruleIndex ?? 0;
		if (event.status === "wallet_prompt" || event.status === "start") {
			return payoutApproveStepId(ruleIndex);
		}
		if (event.status === "done") return payoutApproveStepId(ruleIndex);
	}

	if (event.phase === "confirming_transaction") {
		const ruleIndex = event.ruleIndex ?? 0;
		if (event.txLabel === "USDC approval") {
			return payoutConfirmApproveStepId(ruleIndex);
		}
		if (event.txLabel === "payout registration") {
			return payoutConfirmRegisterStepId(ruleIndex);
		}
		if (event.txLabel === "attachment rule") {
			return "wallet_attachment_rule";
		}
	}

	if (event.phase === "wallet_payout_register") {
		const ruleIndex = event.ruleIndex ?? 0;
		if (event.status === "wallet_prompt" || event.status === "start") {
			return payoutRegisterStepId(ruleIndex);
		}
		if (event.status === "done") return payoutRegisterStepId(ruleIndex);
	}

	return null;
}

export function reduceSendProgress(
	state: SendProgressState,
	event: SendProgressEvent,
): SendProgressState {
	if (state.status === "success") return state;

	const stepId = resolveStepForEvent(event);
	if (event.phase === "send_failed") {
		const message =
			"errorMessage" in event && event.errorMessage
				? event.errorMessage
				: "Something went wrong while sending.";
		return {
			...state,
			status: "error",
			error: {
				stepId: state.activeStepId ?? state.steps[0]?.id ?? "send_failed",
				message,
			},
		};
	}

	if (!stepId) return state;

	if (event.status === "error") {
		const message =
			"errorMessage" in event && event.errorMessage
				? event.errorMessage
				: "Something went wrong while sending.";
		return {
			...state,
			status: "error",
			error: { stepId, message },
		};
	}

	if (event.status === "start" || event.status === "wallet_prompt") {
		return activateStep(state, stepId);
	}

	if (event.status === "confirming") {
		if (event.phase === "confirming_transaction") {
			if (event.txLabel === "USDC approval") {
				const approveId = payoutApproveStepId(event.ruleIndex ?? 0);
				return activateStep(completeStep(state, approveId), stepId);
			}
			if (event.txLabel === "payout registration") {
				const registerId = payoutRegisterStepId(event.ruleIndex ?? 0);
				return activateStep(completeStep(state, registerId), stepId);
			}
		}
		return activateStep(state, stepId);
	}

	if (event.status === "done") {
		let next = completeStep(state, stepId);
		if (event.phase === "wallet_payout_approve") {
			const confirmId = payoutConfirmApproveStepId(event.ruleIndex ?? 0);
			if (!next.completedStepIds.includes(confirmId)) {
				next = completeStep(next, confirmId);
			}
		}
		if (event.phase === "wallet_payout_register") {
			const confirmId = payoutConfirmRegisterStepId(event.ruleIndex ?? 0);
			if (!next.completedStepIds.includes(confirmId)) {
				next = completeStep(next, confirmId);
			}
		}
		if (event.phase === "self_sign") {
			return { ...next, status: "success", activeStepId: null };
		}
		return next;
	}

	return state;
}

export function markSendProgressSuccess(
	state: SendProgressState,
): SendProgressState {
	const completedStepIds = state.steps.map((step) => step.id);
	return {
		...state,
		completedStepIds,
		activeStepId: null,
		status: "success",
	};
}

export type SendProgressDisplay = {
	label: string;
	detail?: string;
	isError: boolean;
};

export function getActiveSendProgressDisplay(
	state: SendProgressState,
): SendProgressDisplay {
	if (state.status === "error" && state.error) {
		const failedStep = state.steps.find(
			(step) => step.id === state.error?.stepId,
		);
		return {
			label: failedStep?.label ?? "Could not send envelope",
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
		label: "Sending your envelope",
		isError: false,
	};
}
