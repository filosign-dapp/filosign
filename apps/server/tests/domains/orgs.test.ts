import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { hashOrgIdCommitment } from "@filosign/shared";
import { type Address, getAddress } from "viem";
import { dbQueryResult } from "../support/db-query-result";
import { testEnvStub } from "../support/env-stub";

describe("orgs", () => {
	describe("org-controllers", () => {
		const orgId = "00000000-0000-7000-8000-000000000099";
		const orgIdCommitment = hashOrgIdCommitment(orgId);
		const owner = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
		const admin = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
		const member = "0xcccccccccccccccccccccccccccccccccccccccc" as const;

		beforeAll(() => {
			mock.module("@/lib/platform/db", () => ({
				default: {
					schema: { organizationMembers: {} },
					select: () => ({
						from: () => ({
							where: () =>
								dbQueryResult([
									{ walletAddress: owner },
									{ walletAddress: admin },
								]),
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
							getAddress(wallet).toLowerCase() ===
								getAddress(admin).toLowerCase(),
					},
				}),
				fsContracts: {},
			}));
		});

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
					[
						getAddress(owner).toLowerCase(),
						getAddress(admin).toLowerCase(),
					].sort(),
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
	});

	describe("org-controller-relay", () => {
		const orgId = "00000000-0000-7000-8000-000000000099";
		const orgIdCommitment = hashOrgIdCommitment(orgId);
		const owner = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
		const admin = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
		const sender = "0x1111111111111111111111111111111111111111" as const;
		const unlistedWallet =
			"0xdddddddddddddddddddddddddddddddddddddddd" as const;
		const registryAddress =
			"0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as `0x${string}`;

		let chainControllers = new Set<string>();

		beforeAll(() => {
			mock.module("@/lib/platform/db", () => ({
				default: {
					schema: { organizationMembers: {} },
					select: () => ({
						from: () => ({
							where: () =>
								dbQueryResult([
									{ walletAddress: owner },
									{ walletAddress: admin },
								]),
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
		});

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
	});

	describe("platform-admin-gate", () => {
		const envState = {
			...testEnvStub,
			PLATFORM_ADMIN_EMAILS: "admin@filosign.test",
		};

		beforeAll(() => {
			mock.module("@/env", () => ({
				default: envState,
				env: envState,
			}));
		});

		afterAll(() => {
			mock.restore();
		});

		describe("platform admin", () => {
			test("allowsPlatformAdminAccess for configured emails", async () => {
				const { allowsPlatformAdminAccess } = await import(
					"@/lib/platform/admin"
				);
				expect(allowsPlatformAdminAccess("admin@filosign.test")).toBe(true);
				expect(allowsPlatformAdminAccess("Admin@Filosign.test")).toBe(true);
				expect(allowsPlatformAdminAccess("other@example.com")).toBe(false);
			});

			test("shouldAutoGrantTeamsProForAdminEmail follows admin email list (all deployments)", async () => {
				const { shouldAutoGrantTeamsProForAdminEmail } = await import(
					"@/lib/platform/admin"
				);
				expect(
					shouldAutoGrantTeamsProForAdminEmail("admin@filosign.test"),
				).toBe(true);
				expect(shouldAutoGrantTeamsProForAdminEmail("other@example.com")).toBe(
					false,
				);
			});
		});
	});
});
