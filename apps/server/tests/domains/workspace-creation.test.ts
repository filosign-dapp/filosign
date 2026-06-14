import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { restoreTestEnvMock } from "../support/env-stub";

function expectAppError(code: string, fn: () => void) {
	try {
		fn();
		throw new Error("expected throwAppError");
	} catch (err) {
		expect(err).toMatchObject({ data: { appCode: code } });
	}
}

describe("workspace creation policy", () => {
	beforeAll(() => {
		restoreTestEnvMock();
	});

	afterAll(() => {
		restoreTestEnvMock();
	});

	test("first org is personal; additional orgs are not", async () => {
		const { resolveIsPersonalForNewOrganization } = await import(
			"@/lib/domains/orgs/workspace"
		);
		expect(resolveIsPersonalForNewOrganization(0)).toBe(true);
		expect(resolveIsPersonalForNewOrganization(1)).toBe(false);
		expect(resolveIsPersonalForNewOrganization(3)).toBe(false);
	});

	test("additional org without pendingBillingId throws PAID_PLAN_REQUIRED", async () => {
		const { assertPaidPlanPendingForAdditionalOrg } = await import(
			"@/lib/domains/orgs/workspace"
		);

		expect(() =>
			assertPaidPlanPendingForAdditionalOrg({
				ownedCountBeforeCreate: 0,
				pendingBillingId: undefined,
			}),
		).not.toThrow();

		expectAppError("WORKSPACE.PAID_PLAN_REQUIRED", () =>
			assertPaidPlanPendingForAdditionalOrg({
				ownedCountBeforeCreate: 1,
				pendingBillingId: undefined,
			}),
		);

		expectAppError("WORKSPACE.PAID_PLAN_REQUIRED", () =>
			assertPaidPlanPendingForAdditionalOrg({
				ownedCountBeforeCreate: 2,
				pendingBillingId: "   ",
			}),
		);
	});

	test("additional org with pendingBillingId passes gate", async () => {
		const { assertPaidPlanPendingForAdditionalOrg } = await import(
			"@/lib/domains/orgs/workspace"
		);
		expect(() =>
			assertPaidPlanPendingForAdditionalOrg({
				ownedCountBeforeCreate: 1,
				pendingBillingId: "00000000-0000-4000-8000-000000000001",
			}),
		).not.toThrow();
	});

	test("first org may remain free after attach", async () => {
		const { assertOrgSubscriptionIsPaidAfterAttach } = await import(
			"@/lib/domains/orgs/workspace"
		);
		expect(() =>
			assertOrgSubscriptionIsPaidAfterAttach({
				ownedCountBeforeCreate: 0,
				planId: "free",
				status: "active",
				cancelAtPeriodEnd: false,
				periodEnd: null,
			}),
		).not.toThrow();
	});

	test("additional org must have paid plan after attach", async () => {
		const { assertOrgSubscriptionIsPaidAfterAttach } = await import(
			"@/lib/domains/orgs/workspace"
		);

		for (const planId of ["teams", "teams_pro"] as const) {
			expect(() =>
				assertOrgSubscriptionIsPaidAfterAttach({
					ownedCountBeforeCreate: 1,
					planId,
					status: "active",
					cancelAtPeriodEnd: false,
					periodEnd: null,
				}),
			).not.toThrow();
		}

		expectAppError("WORKSPACE.PAID_PLAN_REQUIRED", () =>
			assertOrgSubscriptionIsPaidAfterAttach({
				ownedCountBeforeCreate: 1,
				planId: "free",
				status: "active",
				cancelAtPeriodEnd: false,
				periodEnd: null,
			}),
		);

		expectAppError("WORKSPACE.PAID_PLAN_REQUIRED", () =>
			assertOrgSubscriptionIsPaidAfterAttach({
				ownedCountBeforeCreate: 1,
				planId: "individual",
				status: "active",
				cancelAtPeriodEnd: false,
				periodEnd: null,
			}),
		);
	});

	test("Solo checkout UI only on personal org", async () => {
		const { buildWorkspaceAllowedActions } = await import(
			"@/lib/domains/billing/utils/plans"
		);

		const personalFree = buildWorkspaceAllowedActions({
			orgPlanId: "free",
			usedSeats: 1,
			hasOrgDodo: false,
			orgProvider: "manual",
			isPersonalOrg: true,
		});
		const teamFree = buildWorkspaceAllowedActions({
			orgPlanId: "free",
			usedSeats: 1,
			hasOrgDodo: false,
			orgProvider: "manual",
			isPersonalOrg: false,
		});

		expect(personalFree.canCheckoutSolo).toBe(true);
		expect(personalFree.showSoloOnWorkspace).toBe(true);
		expect(teamFree.canCheckoutSolo).toBe(false);
		expect(teamFree.showSoloOnWorkspace).toBe(false);
	});
});
