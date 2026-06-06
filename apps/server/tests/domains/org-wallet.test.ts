import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import type { Address } from "viem";
import { dbQueryResult } from "../support/db-query-result";

describe("org-wallet", () => {
	const orgId = "00000000-0000-7000-8000-000000000001";
	const owner = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Address;

	beforeAll(async () => {
		mock.module("@/lib/platform/db", () => ({
			default: {
				schema: { organizations: {} },
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
			},
		}));
	});

	afterAll(() => {
		mock.restore();
	});

	test("orgsUnlinkOrgWallet clears treasury address for org admins", async () => {
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
});
