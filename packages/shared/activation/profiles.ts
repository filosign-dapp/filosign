import type { Deployment } from "../utils/deployment";
import type {
	ActivationProfile,
	ActivationProfileId,
	BillingPlanId,
} from "./types";

export const ACTIVATION_PROFILES: Record<
	ActivationProfileId,
	ActivationProfile
> = {
	free: {},
	individual: {},
	teams: {},
	teams_pro: {},
	enterprise: {},
	sandbox: {
		extends: "teams_pro",
		addStepIds: ["sandbox_vs_production", "sandbox_testnet_limits"],
		omitStepIds: ["payout_packet_access"],
	},
};

export function resolveActivationProfile(args: {
	deployment: Deployment;
	billingPlanId: BillingPlanId;
}): ActivationProfileId {
	if (args.deployment === "sandbox") return "sandbox";
	return args.billingPlanId;
}

export function resolveProfileBasePlan(
	profileId: ActivationProfileId,
): BillingPlanId {
	const profile = ACTIVATION_PROFILES[profileId];
	if (profileId === "sandbox" && profile.extends) {
		return profile.extends;
	}
	return profileId as BillingPlanId;
}
