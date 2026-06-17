import { describe, expect, mock, test } from "bun:test";
import type { PlanId } from "@filosign/entitlements";
import type { Address } from "viem";
import { dbQueryResult } from "../support/db-query-result";
import { mockEntitlementsDomain } from "../support/entitlements-domain-mock";

const orgId = "00000000-0000-7000-8000-000000000001";
const owner = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Address;
let activePlan: PlanId = "teams_pro";

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: {
			organizations: {},
			organizationMembers: { walletAddress: "walletAddress" },
		},
		update: () => ({
			set: (values: Record<string, unknown>) => ({
				where: () => ({
					returning: () =>
						dbQueryResult([
							{
								orgWalletAddress: values.orgWalletAddress ?? null,
								orgWalletLinkedAt: values.orgWalletLinkedAt ?? null,
							},
						]),
				}),
			}),
		}),
		select: () => ({
			from: () => ({
				where: () => dbQueryResult([]),
			}),
		}),
	},
}));

mockEntitlementsDomain({
	resolveEntitlementContext: async () => ({
		subject: { type: "org_member", orgId, wallet: owner },
		planId: activePlan,
		periodStart: new Date("2026-01-01T00:00:00.000Z"),
		usage: {},
	}),
});

describe("org-wallet", () => {
	test("orgsUnlinkOrgWallet clears treasury address for org admins", async () => {
		activePlan = "teams_pro";
		const { orgsUnlinkOrgWallet } = await import("@/api/handlers/orgs/core");

		const result = await orgsUnlinkOrgWallet(
			owner,
			{
				organizationId: orgId,
				role: "owner",
				encryptionPublicKey: `0x${"ab".repeat(32)}`,
				signingMode: "acting_member",
			},
			{ organizationId: orgId },
		);

		expect(result.orgWalletAddress).toBeNull();
		expect(result.orgWalletLinkedAt).toBeNull();
	});

	test("orgsUnlinkOrgWallet rejects when org id mismatches active org", async () => {
		activePlan = "teams_pro";
		const { orgsUnlinkOrgWallet } = await import("@/api/handlers/orgs/core");

		await expect(
			orgsUnlinkOrgWallet(
				owner,
				{
					organizationId: orgId,
					role: "owner",
					encryptionPublicKey: `0x${"ab".repeat(32)}`,
					signingMode: "acting_member",
				},
				{ organizationId: "00000000-0000-7000-8000-000000000099" },
			),
		).rejects.toThrow("Organization mismatch");
	});

	test("orgsUnlinkOrgWallet rejects without workspace treasury entitlement", async () => {
		activePlan = "teams";
		const { orgsUnlinkOrgWallet } = await import("@/api/handlers/orgs/core");

		await expect(
			orgsUnlinkOrgWallet(
				owner,
				{
					organizationId: orgId,
					role: "owner",
					encryptionPublicKey: `0x${"ab".repeat(32)}`,
					signingMode: "acting_member",
				},
				{ organizationId: orgId },
			),
		).rejects.toThrow();
		activePlan = "teams_pro";
	});
});
