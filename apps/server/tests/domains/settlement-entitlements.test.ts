import { afterAll, describe, expect, mock, test } from "bun:test";
import type { EntitlementContext } from "@filosign/entitlements";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import {
	assertSettlementRuleEntitlements,
	assertSettlementUpdateEntitlements,
} from "@/lib/domains/settlements/utils/settlement-entitlements";

const orgId = "00000000-0000-7000-8000-000000000001";

mock.module("@/lib/domains/settlement-access/settlement-access", () => ({
	assertOrganizationSettlementFeatureApproved: async () => {},
}));

afterAll(() => {
	mock.restore();
});

function ctx(planId: "teams" | "teams_pro"): EntitlementContext {
	return {
		subject: {
			type: "user",
			wallet: "0x0000000000000000000000000000000000000001",
		},
		planId,
		periodStart: new Date("2026-05-01T00:00:00Z"),
		usage: {},
	};
}

const baseRule = (
	overrides: Partial<SettlementRuleRegistrationInput> = {},
): SettlementRuleRegistrationInput => ({
	onChainRuleId: "1",
	legs: [
		{
			recipientWallet: "0x0000000000000000000000000000000000000001",
			recipientSource: "signer",
			amount: "1000000",
		},
	],
	tokenAddress: "0x0000000000000000000000000000000000000abc",
	cidIdentifier:
		"0x0000000000000000000000000000000000000000000000000000000000000001",
	releaseType: "all_signed",
	releaseParams: { releaseType: "all_signed" },
	registerRuleTxHash:
		"0x0000000000000000000000000000000000000000000000000000000000000002",
	approveTxHash:
		"0x0000000000000000000000000000000000000000000000000000000000000003",
	...overrides,
});

describe("settlement entitlements", () => {
	test("rejects payout registration without workspace organizationId", async () => {
		await expect(
			assertSettlementRuleEntitlements(ctx("teams"), baseRule(), null),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: expect.stringContaining("workspace envelope"),
		});
	});

	test("allows basic single-leg all_signed on teams with workspace", async () => {
		await assertSettlementRuleEntitlements(ctx("teams"), baseRule(), orgId);
	});

	test("rejects multi-leg rules without advanced entitlement", async () => {
		await expect(
			assertSettlementRuleEntitlements(
				ctx("teams"),
				baseRule({
					legs: [
						...baseRule().legs,
						{
							recipientWallet: "0x0000000000000000000000000000000000000002",
							recipientSource: "signer",
							amount: "1000000",
						},
					],
				}),
				orgId,
			),
		).rejects.toBeInstanceOf(ORPCError);
	});

	test("allows advanced release types on teams_pro", async () => {
		await assertSettlementRuleEntitlements(
			ctx("teams_pro"),
			baseRule({
				releaseType: "quorum_all",
				releaseParams: { releaseType: "quorum_all", thresholdN: 2 },
			}),
			orgId,
		);
	});

	test("update requires workspace and advanced entitlement", async () => {
		await expect(
			assertSettlementUpdateEntitlements(ctx("teams"), null),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: expect.stringContaining("workspace envelope"),
		});
		await expect(
			assertSettlementUpdateEntitlements(ctx("teams"), orgId),
		).rejects.toBeInstanceOf(ORPCError);
		await assertSettlementUpdateEntitlements(ctx("teams_pro"), orgId);
	});
});
