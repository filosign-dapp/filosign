import { ACTIVATION_CATALOG_VERSION } from "./milestones";
import {
	ACTIVATION_PROFILES,
	resolveActivationProfile,
	resolveProfileBasePlan,
} from "./profiles";
import {
	ACTIVATION_STEPS,
	BASIC_ONBOARDING_STEP_IDS,
	CORE_STEP_IDS,
	PLAN_ADVANCED_STEP_IDS,
} from "./steps";
import type {
	ActivationStepId,
	EvaluateActivationChecklistArgs,
	EvaluateActivationChecklistResult,
	EvaluatedActivationStep,
} from "./types";

function featuresEnabled(
	features: EvaluateActivationChecklistArgs["features"],
	keys: readonly string[] | undefined,
): boolean {
	if (!keys || keys.length === 0) return true;
	return keys.every((key) => features[key]?.enabled === true);
}

function resolveStepIds(
	args: EvaluateActivationChecklistArgs,
): ActivationStepId[] {
	const profileId = resolveActivationProfile(args);
	const profile = ACTIVATION_PROFILES[profileId];
	const basePlan = resolveProfileBasePlan(profileId);

	const ids = new Set<ActivationStepId>(CORE_STEP_IDS);

	for (const stepId of PLAN_ADVANCED_STEP_IDS[basePlan]) {
		ids.add(stepId);
	}

	for (const stepId of profile.addStepIds ?? []) {
		ids.add(stepId);
	}

	for (const stepId of profile.omitStepIds ?? []) {
		ids.delete(stepId);
	}

	return [...ids];
}

function resolveHref(
	stepId: ActivationStepId,
	args: EvaluateActivationChecklistArgs,
): string | undefined {
	switch (stepId) {
		case "confirm_signature":
			return "/dashboard/signature/create";
		case "sign_practice_agreement":
			return args.practicePieceCid
				? `/dashboard/document/sign?pieceCid=${encodeURIComponent(args.practicePieceCid)}`
				: undefined;
		case "learn_proof_packets":
			return "/dashboard/support/tutorials";
		case "send_first_envelope":
			return "/dashboard/envelope/create";
		case "invite_teammates":
			return "/dashboard/settings/team";
		case "gated_file_release":
			return "/dashboard/envelope/create";
		case "payout_packet_access":
			return "/dashboard/settings/settlements";
		case "add_connections":
			return "/dashboard/settings/connections";
		case "advanced_settlements":
			return "/dashboard/envelope/create";
		default:
			return undefined;
	}
}

export function evaluateActivationChecklist(
	args: EvaluateActivationChecklistArgs,
): EvaluateActivationChecklistResult {
	const profileId = resolveActivationProfile(args);
	const basePlan = resolveProfileBasePlan(profileId);
	const stepIds = resolveStepIds(args);

	const steps: EvaluatedActivationStep[] = [];

	for (const stepId of stepIds) {
		const def = ACTIVATION_STEPS[stepId];
		if (!def) continue;

		if (def.requiresPlans && !def.requiresPlans.includes(basePlan)) {
			continue;
		}

		if (
			def.requiresDeployments &&
			!def.requiresDeployments.includes(args.deployment)
		) {
			continue;
		}

		if (!featuresEnabled(args.features, def.requiresFeatures)) {
			continue;
		}

		const completed = def.milestoneId
			? args.milestones.has(def.milestoneId)
			: false;

		steps.push({
			...def,
			completed,
			href: resolveHref(stepId, args),
		});
	}

	const coreComplete = CORE_STEP_IDS.every((id) => {
		const def = ACTIVATION_STEPS[id];
		return def.milestoneId ? args.milestones.has(def.milestoneId) : true;
	});

	const basicOnboardingComplete = BASIC_ONBOARDING_STEP_IDS.every((id) => {
		const def = ACTIVATION_STEPS[id];
		return def.milestoneId ? args.milestones.has(def.milestoneId) : true;
	});

	return {
		profileId,
		catalogVersion: ACTIVATION_CATALOG_VERSION,
		steps,
		coreComplete,
		basicOnboardingComplete,
	};
}
