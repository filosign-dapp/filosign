import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { effectivePlanIdFromStatus } from "@/lib/domains/entitlements";
import {
	generatePlatformInviteToken,
	generateSetupToken,
	isActivePartnerTrialSubscription,
} from "@/lib/domains/platform-access";
import { dbQueryResult } from "../support/db-query-result";

describe("platform-access tokens", () => {
	test("invite tokens are url-safe and long enough", () => {
		const token = generatePlatformInviteToken();
		expect(token.length).toBeGreaterThanOrEqual(16);
		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	test("setup tokens are url-safe", () => {
		const token = generateSetupToken();
		expect(token.length).toBeGreaterThanOrEqual(16);
	});
});

describe("registerUserAccount contract", () => {
	test("register handler delegates to registerUserAccount module", async () => {
		const mod = await import(
			"@/lib/domains/platform-access/utils/register-user"
		);
		expect(typeof mod.registerUserAccount).toBe("function");
	});
});

describe("partner trial subscription", () => {
	const now = new Date("2026-06-01T12:00:00.000Z");
	const futureEnd = new Date("2026-07-01T12:00:00.000Z");
	const pastEnd = new Date("2026-05-01T12:00:00.000Z");

	test("isActivePartnerTrialSubscription accepts manual trialing teams_pro", () => {
		expect(
			isActivePartnerTrialSubscription(
				{
					planId: "teams_pro",
					status: "trialing",
					provider: "manual",
					periodStart: now,
					periodEnd: futureEnd,
					featureOverrides: {},
				},
				now,
			),
		).toBe(true);
	});

	test("isActivePartnerTrialSubscription rejects expired, active, and non-org plans", () => {
		const base = {
			planId: "teams_pro",
			status: "trialing",
			provider: "manual",
			periodStart: now,
			periodEnd: futureEnd,
			featureOverrides: {},
		} as const;

		expect(
			isActivePartnerTrialSubscription({ ...base, periodEnd: pastEnd }, now),
		).toBe(false);
		expect(
			isActivePartnerTrialSubscription({ ...base, status: "active" }, now),
		).toBe(false);
		expect(
			isActivePartnerTrialSubscription({ ...base, planId: "individual" }, now),
		).toBe(false);
		expect(
			isActivePartnerTrialSubscription({ ...base, provider: "dodo" }, now),
		).toBe(false);
	});

	test("canceled partner trial downgrades to free for workspace entitlements", () => {
		expect(
			effectivePlanIdFromStatus(
				{
					planId: "teams_pro",
					status: "canceled",
					periodEnd: pastEnd,
				},
				now,
			),
		).toBe("free");
	});

	describe("partner invite settlement access", () => {
		test("grantPartnerInviteSettlementAccessWithTx is exported", async () => {
			const mod = await import("@/lib/domains/settlement-access");
			expect(typeof mod.grantPartnerInviteSettlementAccessWithTx).toBe(
				"function",
			);
		});
	});
});

describe("resolvePartnerInviteTrialForWorkspace", () => {
	const wallet = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
	const orgId = "00000000-0000-7000-8000-000000000099";
	const futureEnd = new Date("2026-07-01T12:00:00.000Z");

	let redemptionRows: unknown[] = [];
	let orgSubRows: unknown[] = [];

	beforeAll(() => {
		mock.module("@/lib/platform/db", () => ({
			default: {
				select: () => ({
					from: () => ({
						innerJoin: () => ({
							where: () => ({
								limit: () => dbQueryResult(redemptionRows),
							}),
						}),
						where: () => ({
							limit: () => dbQueryResult(orgSubRows),
						}),
					}),
				}),
			},
		}));
	});

	afterAll(() => {
		mock.restore();
	});

	test("returns null when wallet has no partner_trial redemption", async () => {
		redemptionRows = [];
		orgSubRows = [];
		const { resolvePartnerInviteTrialForWorkspace } = await import(
			"@/lib/domains/platform-access/registration"
		);

		const result = await resolvePartnerInviteTrialForWorkspace({
			wallet,
			organizationId: orgId,
		});
		expect(result).toBeNull();
	});

	test("returns active trial context when redemption and org sub match", async () => {
		redemptionRows = [{ trialDays: 30 }];
		orgSubRows = [
			{
				planId: "teams_pro",
				status: "trialing",
				provider: "manual",
				periodStart: new Date("2026-06-01T12:00:00.000Z"),
				periodEnd: futureEnd,
				featureOverrides: {},
			},
		];
		const { resolvePartnerInviteTrialForWorkspace } = await import(
			"@/lib/domains/platform-access/registration"
		);

		const result = await resolvePartnerInviteTrialForWorkspace({
			wallet,
			organizationId: orgId,
		});

		expect(result).toEqual({
			active: true,
			planId: "teams_pro",
			planName: "Teams Pro",
			trialDays: 30,
			periodEnd: futureEnd.toISOString(),
		});
	});

	test("returns null when org subscription trial expired", async () => {
		redemptionRows = [{ trialDays: 30 }];
		orgSubRows = [
			{
				planId: "teams_pro",
				status: "trialing",
				provider: "manual",
				periodStart: new Date("2026-04-01T12:00:00.000Z"),
				periodEnd: new Date("2026-05-01T12:00:00.000Z"),
				featureOverrides: {},
			},
		];
		const { resolvePartnerInviteTrialForWorkspace } = await import(
			"@/lib/domains/platform-access/registration"
		);

		const result = await resolvePartnerInviteTrialForWorkspace({
			wallet,
			organizationId: orgId,
		});
		expect(result).toBeNull();
	});
});
