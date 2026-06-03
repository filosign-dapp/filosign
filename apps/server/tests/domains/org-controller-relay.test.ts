import { afterAll, describe, expect, mock, test } from "bun:test";
import { hashOrgIdCommitment } from "@filosign/shared";
import { type Address, getAddress } from "viem";
import { dbQueryResult } from "../support/db-query-result";

const orgId = "00000000-0000-7000-8000-000000000099";
const orgIdCommitment = hashOrgIdCommitment(orgId);
const owner = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
const admin = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
const sender = "0x1111111111111111111111111111111111111111" as const;
const unlistedWallet = "0xdddddddddddddddddddddddddddddddddddddddd" as const;
const registryAddress =
	"0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as `0x${string}`;

let chainControllers = new Set<string>();

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
				Address,
			]) => {
				if (commitment.toLowerCase() !== orgIdCommitment.toLowerCase()) {
					return false;
				}
				return chainControllers.has(getAddress(wallet).toLowerCase());
			},
		},
	}),
	fsContracts: {},
	evmClient: {},
	fsPaymentValidatorAt: () => ({}),
}));

afterAll(() => {
	mock.restore();
});

describe("assertOrgControllerMayRelay", () => {
	test("passes when Postgres and registry agree", async () => {
		chainControllers = new Set([getAddress(admin).toLowerCase()]);
		const { assertOrgControllerMayRelay } = await import(
			"@/lib/domains/orgs/controllers"
		);

		await assertOrgControllerMayRelay({
			organizationId: orgId,
			wallet: getAddress(admin),
			registryAddress,
		});
	});

	test("rejects when wallet is not an active owner/admin", async () => {
		chainControllers = new Set([getAddress(unlistedWallet).toLowerCase()]);
		const { assertOrgControllerMayRelay } = await import(
			"@/lib/domains/orgs/controllers"
		);

		await expect(
			assertOrgControllerMayRelay({
				organizationId: orgId,
				wallet: unlistedWallet,
				registryAddress,
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("rejects when Postgres allows but registry mapping is missing", async () => {
		chainControllers = new Set();
		const { assertOrgControllerMayRelay } = await import(
			"@/lib/domains/orgs/controllers"
		);

		await expect(
			assertOrgControllerMayRelay({
				organizationId: orgId,
				wallet: getAddress(admin),
				registryAddress,
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});

describe("assertRecallerMayRelay", () => {
	test("sender recall skips on-chain controller preflight", async () => {
		chainControllers = new Set();
		const { assertRecallerMayRelay } = await import(
			"@/lib/domains/files/recall-auth"
		);

		await assertRecallerMayRelay({
			wallet: getAddress(sender),
			file: { sender, organizationId: orgId },
			recaller: getAddress(sender),
			activeOrg: null,
			registryAddress,
		});
	});

	test("controller recall requires registry mapping", async () => {
		chainControllers = new Set([getAddress(owner).toLowerCase()]);
		const { assertRecallerMayRelay } = await import(
			"@/lib/domains/files/recall-auth"
		);

		await assertRecallerMayRelay({
			wallet: getAddress(owner),
			file: { sender, organizationId: orgId },
			recaller: getAddress(owner),
			activeOrg: {
				organizationId: orgId,
				role: "owner",
				encryptionPublicKey: `0x${"ab".repeat(32)}`,
				signingMode: "acting_member",
			},
			registryAddress,
		});
	});
});
