import type { Deployment } from "../utils/deployment";
import type { ActivationMilestoneId } from "./milestones";

/** Mirrors billing PlanId — kept local to avoid entitlements dependency. */
export const BILLING_PLAN_IDS = [
	"free",
	"individual",
	"teams",
	"teams_pro",
	"enterprise",
] as const;

export type BillingPlanId = (typeof BILLING_PLAN_IDS)[number];

export type ActivationProfileId = BillingPlanId | "sandbox";

export type ActivationStepSection = "core" | "advanced" | "disclosure";

export type ActivationStepId =
	| "confirm_signature"
	| "sign_practice_agreement"
	| "learn_proof_packets"
	| "send_first_envelope"
	| "gated_file_release"
	| "payout_packet_access"
	| "invite_teammates"
	| "advanced_settlements"
	| "sandbox_vs_production"
	| "sandbox_testnet_limits"
	| "try_sandbox_workflow"
	| "upgrade_premium_plan";

export type ActivationFeatureSnapshot = Record<
	string,
	{ enabled: boolean } | undefined
>;

export type ActivationStepLinkKey = "pricing" | "sandbox";

export type ActivationStepDef = {
	id: ActivationStepId;
	section: ActivationStepSection;
	title: string;
	description: string;
	milestoneId?: ActivationMilestoneId;
	/** When set, step is shown only if every feature is enabled. */
	requiresFeatures?: readonly string[];
	/** Visible only for these billing plans (production profiles). */
	requiresPlans?: readonly BillingPlanId[];
	/** Visible only on these deployments (e.g. production-only upgrade CTAs). */
	requiresDeployments?: readonly Deployment[];
	hintOnly?: boolean;
	/** Client resolves href from env / shared defaults when set. */
	linkKey?: ActivationStepLinkKey;
};

export type EvaluatedActivationStep = ActivationStepDef & {
	completed: boolean;
	/** Resolved href for client navigation (optional). */
	href?: string;
};

export type EvaluateActivationChecklistArgs = {
	deployment: Deployment;
	billingPlanId: BillingPlanId;
	milestones: ReadonlySet<ActivationMilestoneId>;
	features: ActivationFeatureSnapshot;
	practicePieceCid?: string | null;
};

export type EvaluateActivationChecklistResult = {
	profileId: ActivationProfileId;
	catalogVersion: number;
	steps: EvaluatedActivationStep[];
	coreComplete: boolean;
	/** True when signature, practice sign, and first send milestones are done. */
	basicOnboardingComplete: boolean;
};

export type ActivationProfile = {
	extends?: BillingPlanId;
	omitStepIds?: readonly ActivationStepId[];
	addStepIds?: readonly ActivationStepId[];
};
