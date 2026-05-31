import { afterAll, describe, expect, mock, test } from "bun:test";

const orgId = "00000000-0000-7000-8000-000000000099";
const wallet = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

mock.module("@/lib/domains/orgs", () => ({
	resolveActiveOrg: async () => ({
		organizationId: orgId,
		role: "owner",
	}),
	assertOrgPermission: () => {},
}));

afterAll(() => {
	mock.restore();
});

describe("settlement feature access submit", () => {
	test("rejects outdated terms version before persistence", async () => {
		const { submitOrganizationSettlementFeatureRequest } = await import(
			"@/lib/domains/settlement-access/settlement-access"
		);

		await expect(
			submitOrganizationSettlementFeatureRequest({
				wallet,
				organizationId: orgId,
				body: {
					acceptTerms: true,
					sanctionsSelfCert: true,
					useCase: "Valid use case text here",
					termsVersion: "outdated-version",
				},
			}),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: expect.stringContaining("outdated"),
		});
	});
});
