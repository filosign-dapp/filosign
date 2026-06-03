import { afterAll, describe, expect, mock, test } from "bun:test";
import { hashOrgIdCommitment } from "@filosign/shared";
import { getAddress } from "viem";
import { dbQueryResult } from "../support/db-query-result";

const orgId = "00000000-0000-7000-8000-000000000099";
const orgIdCommitment = hashOrgIdCommitment(orgId);
const owner = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
const admin = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
const member = "0xcccccccccccccccccccccccccccccccccccccccc" as const;

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: { organizationMembers: {} },
		select: () => ({
			from: () => ({
				where: () =>
					dbQueryResult([{ walletAddress: owner }, { walletAddress: admin }]),
			}),
		}),
	},
}));

mock.module("@/lib/platform/evm", () => ({
	fsEnvelopeRegistryAt: () => ({
		read: {
			isOrgController: async ([commitment, wallet]: readonly [
				string,
				string,
			]) =>
				commitment.toLowerCase() === orgIdCommitment.toLowerCase() &&
				getAddress(wallet).toLowerCase() === getAddress(admin).toLowerCase(),
		},
	}),
	fsContracts: {},
}));

afterAll(() => {
	mock.restore();
});

describe("org controllers", () => {
	test("listOrgControllerWallets returns deduped owner and admin only", async () => {
		const { listOrgControllerWallets } = await import(
			"@/lib/domains/orgs/controllers"
		);

		const wallets = await listOrgControllerWallets(orgId);
		expect(wallets).toHaveLength(2);
		expect(wallets.map((w) => getAddress(w).toLowerCase()).sort()).toEqual(
			[getAddress(owner).toLowerCase(), getAddress(admin).toLowerCase()].sort(),
		);
	});

	test("isOrgControllerWallet mirrors Postgres membership", async () => {
		const { isOrgControllerWallet } = await import(
			"@/lib/domains/orgs/controllers"
		);

		expect(
			await isOrgControllerWallet({
				organizationId: orgId,
				wallet: getAddress(owner),
			}),
		).toBe(true);
		expect(
			await isOrgControllerWallet({
				organizationId: orgId,
				wallet: member,
			}),
		).toBe(false);
	});

	test("readOrgControllerOnChain reads registry mapping", async () => {
		const { readOrgControllerOnChain } = await import(
			"@/lib/domains/orgs/controllers"
		);

		expect(
			await readOrgControllerOnChain({
				organizationId: orgId,
				wallet: getAddress(admin),
			}),
		).toBe(true);
		expect(
			await readOrgControllerOnChain({
				organizationId: orgId,
				wallet: getAddress(owner),
			}),
		).toBe(false);
	});
});
