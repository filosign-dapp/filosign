import type { Deployment } from "../utils/deployment";
import type { ActivationMilestoneId } from "./milestones";
import { resolveActivationProfile, resolveProfileBasePlan } from "./profiles";
import type { ActivationProfileId, BillingPlanId } from "./types";

type HintFilterDef = {
	requiresDeployments?: readonly Deployment[];
	requiresPlans?: readonly BillingPlanId[];
	requiresProfileIds?: readonly ActivationProfileId[];
	requiresPracticePiece?: boolean;
	requiresMilestones?: readonly ActivationMilestoneId[];
	hideWhenMilestone?: ActivationMilestoneId;
};

export function pathnameMatches(prefix: string, pathname: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function milestonesSatisfied(
	required: readonly ActivationMilestoneId[] | undefined,
	milestones: ReadonlySet<ActivationMilestoneId>,
): boolean {
	if (!required || required.length === 0) return true;
	return required.every((m) => milestones.has(m));
}

export function activationHintProfileContext(args: {
	deployment: Deployment;
	billingPlanId: BillingPlanId;
}) {
	const profileId = resolveActivationProfile({
		deployment: args.deployment,
		billingPlanId: args.billingPlanId,
	});
	const basePlan = resolveProfileBasePlan(profileId);
	const planForFilter =
		profileId === "sandbox" ? basePlan : (profileId as BillingPlanId);
	return { profileId, planForFilter };
}

export function activationHintPassesDeploymentFilter(
	def: HintFilterDef,
	deployment: Deployment,
): boolean {
	return (
		!def.requiresDeployments || def.requiresDeployments.includes(deployment)
	);
}

export function activationHintPassesPlanFilter(
	def: HintFilterDef,
	planForFilter: BillingPlanId,
): boolean {
	return !def.requiresPlans || def.requiresPlans.includes(planForFilter);
}

export function activationHintPassesProfileFilter(
	def: HintFilterDef,
	profileId: ActivationProfileId,
): boolean {
	return !def.requiresProfileIds || def.requiresProfileIds.includes(profileId);
}

export function activationHintPassesPracticePieceFilter(
	def: HintFilterDef,
	practicePieceCid: string | null | undefined,
	currentPieceCid: string | null | undefined,
): boolean {
	if (!def.requiresPracticePiece) return true;
	const practiceCid = practicePieceCid?.trim();
	const currentCid = currentPieceCid?.trim();
	return Boolean(practiceCid && currentCid && practiceCid === currentCid);
}
