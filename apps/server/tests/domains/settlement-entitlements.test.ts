import { describe, expect, test } from "bun:test";
import type { EntitlementContext } from "@filosign/entitlements";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import {
	assertSettlementRuleEntitlements,
	assertSettlementUpdateEntitlements,
} from "@/lib/domains/settlements/utils/settlement-entitlements";

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
	test("allows basic single-leg all_signed on teams", () => {
		expect(() =>
			assertSettlementRuleEntitlements(ctx("teams"), baseRule()),
		).not.toThrow();
	});

	test("rejects multi-leg rules without advanced entitlement", () => {
		expect(() =>
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
			),
		).toThrow(ORPCError);
	});

	test("allows advanced release types on teams_pro", () => {
		expect(() =>
			assertSettlementRuleEntitlements(
				ctx("teams_pro"),
				baseRule({
					releaseType: "quorum_all",
					releaseParams: { releaseType: "quorum_all", thresholdN: 2 },
				}),
			),
		).not.toThrow();
	});

	test("update requires advanced entitlement", () => {
		expect(() => assertSettlementUpdateEntitlements(ctx("teams"))).toThrow(
			ORPCError,
		);
		expect(() =>
			assertSettlementUpdateEntitlements(ctx("teams_pro")),
		).not.toThrow();
	});
});
