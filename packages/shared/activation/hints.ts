import type { Deployment } from "../utils/deployment";
import type { ActivationMilestoneId } from "./milestones";
import { resolveActivationProfile, resolveProfileBasePlan } from "./profiles";
import type { ActivationProfileId, BillingPlanId } from "./types";

export const ACTIVATION_HINT_IDS = [
	"sign_practice_walkthrough",
	"compose_first_envelope",
	"sandbox_compose_disclosure",
] as const;

export type ActivationHintId = (typeof ACTIVATION_HINT_IDS)[number];

export type ActivationHintLinkKey = "pricing" | "sandbox" | "support";

export type ActivationHintDef = {
	id: ActivationHintId;
	title: string;
	body: string;
	/** Show when current pathname starts with this prefix. */
	routePrefix: string;
	dismissible: boolean;
	/** Resolved client-side from linkKey when href is absent. */
	linkKey?: ActivationHintLinkKey;
	href?: string;
	/** Show only when every listed milestone is present. */
	requiresMilestones?: readonly ActivationMilestoneId[];
	/** Hide once this milestone is recorded. */
	hideWhenMilestone?: ActivationMilestoneId;
	requiresDeployments?: readonly Deployment[];
	requiresPlans?: readonly BillingPlanId[];
	requiresProfileIds?: readonly ActivationProfileId[];
	/** Match current sign page pieceCid to practicePieceCid. */
	requiresPracticePiece?: boolean;
};

export type EvaluatedActivationHint = ActivationHintDef & {
	resolvedHref?: string;
};

export type EvaluateActivationHintsArgs = {
	pathname: string;
	deployment: Deployment;
	billingPlanId: BillingPlanId;
	milestones: ReadonlySet<ActivationMilestoneId>;
	dismissedHintIds: ReadonlySet<string>;
	practicePieceCid?: string | null;
	currentPieceCid?: string | null;
	coreComplete?: boolean;
};

export const ACTIVATION_HINTS: Record<ActivationHintId, ActivationHintDef> = {
	sign_practice_walkthrough: {
		id: "sign_practice_walkthrough",
		title: "Practice signing",
		body: "This is a practice document — your real agreements work the same way. Apply your signature, then submit.",
		routePrefix: "/dashboard/document/sign",
		dismissible: true,
		requiresPracticePiece: true,
		hideWhenMilestone: "practice_document_signed",
	},
	compose_first_envelope: {
		id: "compose_first_envelope",
		title: "Send your first envelope",
		body: "Upload a PDF, add recipients, and send. You can save a draft anytime before registering on-chain.",
		routePrefix: "/dashboard/envelope/create",
		dismissible: true,
		requiresMilestones: ["signature_created"],
		hideWhenMilestone: "first_envelope_sent",
	},
	sandbox_compose_disclosure: {
		id: "sandbox_compose_disclosure",
		title: "Sandbox demo",
		body: "You are on testnet with Teams Pro–like features. Production still requires a paid plan for the same limits.",
		routePrefix: "/dashboard/envelope/create",
		dismissible: true,
		requiresProfileIds: ["sandbox"],
	},
};

/** Default public sandbox client URL (production marketing default). */
export const DEFAULT_SANDBOX_CLIENT_URL = "https://sandbox.filosign.xyz";

function pathnameMatches(prefix: string, pathname: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function milestonesSatisfied(
	required: readonly ActivationMilestoneId[] | undefined,
	milestones: ReadonlySet<ActivationMilestoneId>,
): boolean {
	if (!required || required.length === 0) return true;
	return required.every((m) => milestones.has(m));
}

export function evaluateActivationHints(
	args: EvaluateActivationHintsArgs,
): EvaluatedActivationHint[] {
	const profileId = resolveActivationProfile({
		deployment: args.deployment,
		billingPlanId: args.billingPlanId,
	});
	const basePlan = resolveProfileBasePlan(profileId);
	const hints: EvaluatedActivationHint[] = [];

	for (const def of Object.values(ACTIVATION_HINTS)) {
		if (args.dismissedHintIds.has(def.id)) continue;
		if (!pathnameMatches(def.routePrefix, args.pathname)) continue;

		if (
			def.requiresDeployments &&
			!def.requiresDeployments.includes(args.deployment)
		) {
			continue;
		}

		const planForFilter =
			profileId === "sandbox" ? basePlan : (profileId as BillingPlanId);
		if (def.requiresPlans && !def.requiresPlans.includes(planForFilter)) {
			continue;
		}

		if (def.requiresProfileIds && !def.requiresProfileIds.includes(profileId)) {
			continue;
		}

		if (!milestonesSatisfied(def.requiresMilestones, args.milestones)) {
			continue;
		}

		if (def.hideWhenMilestone && args.milestones.has(def.hideWhenMilestone)) {
			continue;
		}

		if (def.requiresPracticePiece) {
			const practiceCid = args.practicePieceCid?.trim();
			const currentCid = args.currentPieceCid?.trim();
			if (!practiceCid || !currentCid || practiceCid !== currentCid) {
				continue;
			}
		}

		hints.push({
			...def,
			resolvedHref: def.href,
		});
	}

	return hints;
}
