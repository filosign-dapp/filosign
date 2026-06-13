export {
	ACTIVATION_ANALYTICS_KEYS,
	activationAnalyticsContext,
} from "./analytics";
export { evaluateActivationChecklist } from "./evaluate";
export {
	ACTIVATION_HINT_IDS,
	ACTIVATION_HINTS,
	type ActivationHintDef,
	type ActivationHintId,
	type ActivationHintLinkKey,
	DEFAULT_SANDBOX_CLIENT_URL,
	type EvaluateActivationHintsArgs,
	type EvaluatedActivationHint,
	evaluateActivationHints,
} from "./hints";
export {
	ACTIVATION_CATALOG_VERSION,
	ACTIVATION_MILESTONE_IDS,
	type ActivationMilestoneId,
	zActivationMilestoneId,
} from "./milestones";
export {
	ACTIVATION_PROFILES,
	resolveActivationProfile,
	resolveProfileBasePlan,
} from "./profiles";
export {
	ACTIVATION_STEPS,
	BASIC_ONBOARDING_STEP_IDS,
	CORE_STEP_IDS,
	PLAN_ADVANCED_STEP_IDS,
} from "./steps";
export type {
	ActivationFeatureSnapshot,
	ActivationProfile,
	ActivationProfileId,
	ActivationStepDef,
	ActivationStepId,
	ActivationStepSection,
	BILLING_PLAN_IDS,
	BillingPlanId,
	EvaluateActivationChecklistArgs,
	EvaluateActivationChecklistResult,
	EvaluatedActivationStep,
} from "./types";
export {
	buildPracticePlacementManifest,
	WELCOME_PRACTICE_DATE_RECT,
	WELCOME_PRACTICE_DOCUMENT_ID,
	WELCOME_PRACTICE_ENVELOPE_NAME,
	WELCOME_PRACTICE_SIGNATURE_RECT,
	welcomePracticeDocumentSha256,
	welcomePracticePdfBytes,
} from "./welcome-practice";
