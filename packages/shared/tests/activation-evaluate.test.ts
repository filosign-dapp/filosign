import { describe, expect, test } from "bun:test";
import {
	ACTIVATION_MILESTONE_IDS,
	evaluateActivationChecklist,
	resolveActivationProfile,
	zActivationMilestoneId,
} from "../activation";

const allFeaturesEnabled = Object.fromEntries(
	[
		"features.shared_templates",
		"features.team_drafts",
		"features.settlement.basic",
		"features.settlement.advanced",
		"features.supplementary_attachments",
		"features.routing.advanced",
	].map((key) => [key, { enabled: true }]),
);

describe("resolveActivationProfile", () => {
	test("sandbox deployment uses sandbox profile", () => {
		expect(
			resolveActivationProfile({
				deployment: "sandbox",
				billingPlanId: "free",
			}),
		).toBe("sandbox");
	});

	test("production uses billing plan", () => {
		expect(
			resolveActivationProfile({
				deployment: "production",
				billingPlanId: "teams_pro",
			}),
		).toBe("teams_pro");
	});
});

describe("evaluateActivationChecklist", () => {
	test("core steps appear for free production user", () => {
		const result = evaluateActivationChecklist({
			deployment: "production",
			billingPlanId: "free",
			milestones: new Set(),
			features: {},
		});

		const coreIds = result.steps
			.filter((s) => s.section === "core")
			.map((s) => s.id);
		expect(coreIds).toEqual([
			"confirm_signature",
			"sign_practice_agreement",
			"learn_proof_packets",
			"send_first_envelope",
		]);
	});

	test("production free includes optional sandbox and upgrade steps", () => {
		const result = evaluateActivationChecklist({
			deployment: "production",
			billingPlanId: "free",
			milestones: new Set(),
			features: {},
		});

		const advancedIds = result.steps
			.filter((s) => s.section === "advanced")
			.map((s) => s.id);
		expect(advancedIds).toEqual([
			"try_sandbox_workflow",
			"upgrade_premium_plan",
		]);
		expect(
			result.steps.filter((s) => s.id === "try_sandbox_workflow")[0]?.hintOnly,
		).toBe(true);
	});

	test("sandbox deployment omits production-only free upgrade steps", () => {
		const result = evaluateActivationChecklist({
			deployment: "sandbox",
			billingPlanId: "free",
			milestones: new Set(),
			features: allFeaturesEnabled,
		});

		expect(result.steps.some((s) => s.id === "try_sandbox_workflow")).toBe(
			false,
		);
		expect(result.steps.some((s) => s.id === "upgrade_premium_plan")).toBe(
			false,
		);
	});

	test("sandbox adds disclosure steps", () => {
		const result = evaluateActivationChecklist({
			deployment: "sandbox",
			billingPlanId: "free",
			milestones: new Set(),
			features: allFeaturesEnabled,
		});

		expect(result.profileId).toBe("sandbox");
		expect(result.steps.some((s) => s.id === "sandbox_vs_production")).toBe(
			true,
		);
	});

	test("teams advanced steps require features", () => {
		const withoutFeatures = evaluateActivationChecklist({
			deployment: "production",
			billingPlanId: "free",
			milestones: new Set(),
			features: {},
		});
		expect(withoutFeatures.steps.some((s) => s.id === "invite_teammates")).toBe(
			false,
		);

		const withTeamPlan = evaluateActivationChecklist({
			deployment: "production",
			billingPlanId: "teams",
			milestones: new Set(),
			features: {
				"features.shared_templates": { enabled: true },
				"features.team_drafts": { enabled: true },
			},
		});
		expect(withTeamPlan.steps.some((s) => s.id === "invite_teammates")).toBe(
			true,
		);
	});

	test("completed milestones mark steps complete", () => {
		const result = evaluateActivationChecklist({
			deployment: "production",
			billingPlanId: "free",
			milestones: new Set(["signature_created", "practice_document_signed"]),
			features: {},
		});

		const signature = result.steps.find((s) => s.id === "confirm_signature");
		const practice = result.steps.find(
			(s) => s.id === "sign_practice_agreement",
		);
		expect(signature?.completed).toBe(true);
		expect(practice?.completed).toBe(true);
		expect(result.coreComplete).toBe(false);
	});

	test("basic onboarding complete when three starter milestones done", () => {
		const result = evaluateActivationChecklist({
			deployment: "production",
			billingPlanId: "free",
			milestones: new Set([
				"signature_created",
				"practice_document_signed",
				"first_envelope_sent",
			]),
			features: {},
		});

		expect(result.basicOnboardingComplete).toBe(true);
		expect(result.coreComplete).toBe(false);
	});

	test("core complete when all core milestones done", () => {
		const result = evaluateActivationChecklist({
			deployment: "production",
			billingPlanId: "free",
			milestones: new Set([
				"signature_created",
				"practice_document_signed",
				"proof_packet_learned",
				"first_envelope_sent",
			]),
			features: {},
		});
		expect(result.coreComplete).toBe(true);
	});

	test("teams_pro advanced steps resolve workspace hrefs", () => {
		const result = evaluateActivationChecklist({
			deployment: "production",
			billingPlanId: "teams_pro",
			milestones: new Set(),
			features: allFeaturesEnabled,
		});

		expect(result.steps.find((s) => s.id === "invite_teammates")?.href).toBe(
			"/dashboard/settings/workspace",
		);
		expect(
			result.steps.find((s) => s.id === "payout_packet_access")?.href,
		).toBe("/dashboard/settings/workspace");
	});
});

describe("zActivationMilestoneId", () => {
	test("accepts known milestones", () => {
		for (const id of ACTIVATION_MILESTONE_IDS) {
			expect(zActivationMilestoneId.safeParse(id).success).toBe(true);
		}
	});
});
