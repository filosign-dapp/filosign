import { afterAll, describe, expect, mock, test } from "bun:test";
import { SETTLEMENT_FEATURE_TERMS_VERSION } from "@filosign/shared";
import { dbQueryResult } from "../support/db-query-result";

const orgId = "00000000-0000-7000-8000-000000000099";
const admin = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

let updateReturning: unknown[] = [];

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: {
			organizationSettlementFeatureAccess: {},
			organizations: {},
		},
		select: () => ({
			from: () => ({
				where: () => ({
					limit: () =>
						dbQueryResult([
							{
								status: "pending",
								termsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
								acceptedAt: new Date("2026-05-01T00:00:00Z"),
								acceptedByWallet: admin,
								useCase: "Test use case for payouts",
								reviewedAt: null,
								reviewNote: null,
							},
						]),
				}),
			}),
		}),
		update: () => ({
			set: () => ({
				where: () => ({
					returning: () => Promise.resolve(updateReturning),
				}),
			}),
		}),
	},
}));

afterAll(() => {
	mock.restore();
});

describe("settlement feature access admin", () => {
	test("approve returns NOT_FOUND when no request row updated", async () => {
		updateReturning = [];
		const { approveOrganizationSettlementFeatureAccess } = await import(
			"@/lib/domains/settlement-access"
		);

		await expect(
			approveOrganizationSettlementFeatureAccess({
				adminWallet: admin,
				organizationId: orgId,
			}),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});

	test("reject returns NOT_FOUND when no request row updated", async () => {
		updateReturning = [];
		const { rejectOrganizationSettlementFeatureAccess } = await import(
			"@/lib/domains/settlement-access"
		);

		await expect(
			rejectOrganizationSettlementFeatureAccess({
				adminWallet: admin,
				organizationId: orgId,
			}),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});
});
