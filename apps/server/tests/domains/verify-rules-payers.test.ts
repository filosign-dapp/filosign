import { describe, expect, mock, test } from "bun:test";
import type { PlanId } from "@filosign/entitlements";
import { getAddress } from "viem";
import { dbQueryResult } from "../support/db-query-result";
import { mockEntitlementsDomain } from "../support/entitlements-domain-mock";

const sender = "0x1111111111111111111111111111111111111111" as const;
const treasury = "0x2222222222222222222222222222222222222222" as const;
const otherWallet = "0x3333333333333333333333333333333333333333" as const;
const orgId = "00000000-0000-7000-8000-000000000088";
let activePlan: PlanId = "teams_pro";

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: {
			organizations: {
				id: "id",
				orgWalletAddress: "orgWalletAddress",
			},
		},
		select: () => ({
			from: () => ({
				where: () => ({
					limit: () =>
						dbQueryResult([{ orgWalletAddress: getAddress(treasury) }]),
				}),
			}),
		}),
	},
}));

mockEntitlementsDomain({
	resolveEntitlementContext: async (
		wallet: `0x${string}`,
		organizationId: string,
	) => ({
		subject: { type: "org_member", orgId: organizationId, wallet },
		planId: activePlan,
		periodStart: new Date("2026-01-01T00:00:00.000Z"),
		usage: {},
	}),
});

describe("settlements verify-rules-payers", () => {
	describe("resolveAllowedSettlementPayers", () => {
		test("includes sender and linked org treasury", async () => {
			activePlan = "teams_pro";
			const { resolveAllowedSettlementPayers } = await import(
				"@/lib/domains/settlements/utils/verify/rules-on-chain"
			);

			const payerContext = await resolveAllowedSettlementPayers(sender, orgId);

			expect(payerContext.allowed.has(getAddress(sender).toLowerCase())).toBe(
				true,
			);
			expect(payerContext.allowed.has(getAddress(treasury).toLowerCase())).toBe(
				true,
			);
			expect(
				payerContext.allowed.has(getAddress(otherWallet).toLowerCase()),
			).toBe(false);
			expect(payerContext.allowed.size).toBe(2);
			expect(payerContext.orgWalletPayerBlocked).toBe(false);
		});

		test("sender only when organizationId omitted", async () => {
			const { resolveAllowedSettlementPayers } = await import(
				"@/lib/domains/settlements/utils/verify/rules-on-chain"
			);

			const payerContext = await resolveAllowedSettlementPayers(sender, null);

			expect(payerContext.allowed.size).toBe(1);
			expect(payerContext.allowed.has(getAddress(sender).toLowerCase())).toBe(
				true,
			);
		});

		test("blocks org treasury payer when entitlement is disabled", async () => {
			activePlan = "teams";
			const { resolveAllowedSettlementPayers } = await import(
				"@/lib/domains/settlements/utils/verify/rules-on-chain"
			);

			const payerContext = await resolveAllowedSettlementPayers(sender, orgId);
			expect(payerContext.allowed.has(getAddress(sender).toLowerCase())).toBe(
				true,
			);
			expect(payerContext.allowed.has(getAddress(treasury).toLowerCase())).toBe(
				false,
			);
			expect(payerContext.orgWalletPayerBlocked).toBe(true);
			activePlan = "teams_pro";
		});
	});
});
