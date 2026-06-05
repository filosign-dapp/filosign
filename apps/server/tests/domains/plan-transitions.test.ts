import { describe, expect, test } from "bun:test";
import {
	buildUpgradeOfferings,
	resolveMarketingCheckoutPreview,
} from "@/lib/domains/billing/utils/plans";

describe("buildUpgradeOfferings", () => {
	test("solo workspace blocked from team feature sees teams and teams_pro only", () => {
		const result = buildUpgradeOfferings({
			reason: "features.shared_templates",
			userPlanId: "free",
			orgPlanId: "individual",
			hasUserDodo: false,
			hasOrgDodo: true,
		});
		const visible = result.offerings.map((o) => o.planId);
		expect(visible).toEqual(["teams", "teams_pro"]);
		expect(visible).not.toContain("individual");
	});

	test("free workspace document quota can select solo", () => {
		const result = buildUpgradeOfferings({
			reason: "documents.sent.monthly",
			userPlanId: "free",
			orgPlanId: "free",
			hasUserDodo: false,
			hasOrgDodo: false,
		});
		const solo = result.offerings.find((o) => o.planId === "individual");
		expect(solo?.selectable).toBe(true);
		expect(solo?.checkoutRail).toBe("org");
	});

	test("solo workspace document quota does not offer solo checkout again", () => {
		const result = buildUpgradeOfferings({
			reason: "documents.sent.monthly",
			userPlanId: "free",
			orgPlanId: "individual",
			hasUserDodo: false,
			hasOrgDodo: true,
		});
		const solo = result.offerings.find((o) => o.planId === "individual");
		expect(solo).toBeUndefined();
		expect(result.offerings.some((o) => o.planId === "teams")).toBe(true);
	});

	test("free workspace gated files can upgrade to solo", () => {
		const result = buildUpgradeOfferings({
			reason: "features.supplementary_attachments",
			userPlanId: "free",
			orgPlanId: "free",
			hasUserDodo: false,
			hasOrgDodo: false,
		});
		const solo = result.offerings.find((o) => o.planId === "individual");
		expect(solo?.selectable).toBe(true);
	});

	test("solo workspace recipient select offers teams and teams_pro only", () => {
		const result = buildUpgradeOfferings({
			reason: "features.supplementary_attachments.recipient_select",
			userPlanId: "free",
			orgPlanId: "individual",
			hasUserDodo: false,
			hasOrgDodo: true,
		});
		expect(result.offerings.map((o) => o.planId)).toEqual([
			"teams",
			"teams_pro",
		]);
	});

	test("solo workspace on gated files has handoff-specific no-upgrade message", () => {
		const result = buildUpgradeOfferings({
			reason: "features.supplementary_attachments",
			userPlanId: "free",
			orgPlanId: "individual",
			hasUserDodo: false,
			hasOrgDodo: true,
		});
		expect(result.offerings).toHaveLength(0);
		expect(result.noUpgradeMessage).toContain(
			"Solo, which includes this feature",
		);
	});
});

describe("resolveMarketingCheckoutPreview", () => {
	const clientUrl = "https://app.example.com";
	const astroUrl = "https://astro.example.com";

	test("existing solo requesting solo is already_subscribed", () => {
		const preview = resolveMarketingCheckoutPreview({
			requestedPlanId: "individual",
			subscriber: {
				hasUser: true,
				walletPlanId: "free",
				orgPlanId: "individual",
				hasActiveSolo: true,
				hasActiveOrgPlan: false,
				matchingOrgPlan: "individual",
			},
			clientUrl,
			astroUrl,
		});
		expect(preview.action).toBe("already_subscribed");
		if (preview.action === "already_subscribed") {
			expect(preview.suggestedPlans).toEqual(["teams", "teams_pro"]);
		}
	});

	test("unknown email can send_link", () => {
		const preview = resolveMarketingCheckoutPreview({
			requestedPlanId: "individual",
			subscriber: {
				hasUser: false,
				walletPlanId: "free",
				orgPlanId: null,
				hasActiveSolo: false,
				hasActiveOrgPlan: false,
				matchingOrgPlan: null,
			},
			clientUrl,
			astroUrl,
		});
		expect(preview.action).toBe("send_link");
	});
});
