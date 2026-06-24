import type { SendFileIncompleteStep } from "./types";

export const POST_REGISTER_SATELLITE_STEPS = [
	"attachment_rule",
	"payout_registration",
] as const satisfies readonly SendFileIncompleteStep[];

export type PostRegisterSatelliteStep =
	(typeof POST_REGISTER_SATELLITE_STEPS)[number];

export function isPostRegisterSatelliteStep(
	step: SendFileIncompleteStep,
): step is PostRegisterSatelliteStep {
	return step === "attachment_rule" || step === "payout_registration";
}

export function filterPostRegisterSatelliteSteps(
	steps: readonly SendFileIncompleteStep[],
): PostRegisterSatelliteStep[] {
	return steps.filter(isPostRegisterSatelliteStep);
}

export function mergeSendFileIncompleteSteps(
	...groups: readonly (readonly SendFileIncompleteStep[] | undefined)[]
): SendFileIncompleteStep[] {
	return [...new Set(groups.flatMap((group) => group ?? []))];
}
