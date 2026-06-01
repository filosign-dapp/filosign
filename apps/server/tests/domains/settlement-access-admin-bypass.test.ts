import { afterAll, describe, expect, mock, test } from "bun:test";
import { SETTLEMENT_FEATURE_TERMS_VERSION } from "@filosign/shared";

const orgId = "00000000-0000-7000-8000-000000000099";
const adminWallet = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

mock.module("@/lib/platform/admin", () => ({
	isPlatformAdminForWallet: async (wallet: string) =>
		wallet.toLowerCase() === adminWallet.toLowerCase(),
}));

afterAll(() => {
	mock.restore();
});

describe("settlement feature access platform admin bypass", () => {
	test("get returns approved without querying org access row", async () => {
		const { getOrganizationSettlementFeatureAccess } = await import(
			"@/lib/domains/settlement-access/settlement-access"
		);

		const access = await getOrganizationSettlementFeatureAccess(orgId, {
			callerWallet: adminWallet,
		});

		expect(access).toEqual({
			status: "approved",
			termsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
			currentTermsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
			termsCurrent: true,
		});
	});

	test("assertOrganizationSettlementFeatureApproved skips gate for platform admin", async () => {
		const { assertOrganizationSettlementFeatureApproved } = await import(
			"@/lib/domains/settlement-access/settlement-access"
		);

		await expect(
			assertOrganizationSettlementFeatureApproved(orgId, {
				callerWallet: adminWallet,
			}),
		).resolves.toBeUndefined();
	});
});
