import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import type { Address } from "viem";
import { restoreTestEnvMock } from "../support/env-stub";

const orgId = "00000000-0000-4000-8000-000000000001";
const pendingId = "00000000-0000-4000-8000-000000000002";
const wallet = "0x1111111111111111111111111111111111111111" as Address;

describe("attachPendingOrgBillingOnCreateWithTx", () => {
	beforeAll(() => {
		restoreTestEnvMock();
	});

	afterAll(() => {
		restoreTestEnvMock();
	});

	test("updates existing free org subscription instead of inserting a second row", async () => {
		const pendingRow = {
			id: pendingId,
			linkedWallet: wallet,
			status: "linked",
			linkedOrganizationId: null,
			dodoSubscriptionId: "sub_test",
			dodoCustomerId: "cus_test",
			planId: "teams",
			seatCount: 3,
			billingInterval: "monthly",
		};

		let subscriptionPlanId = "free";
		let subscriptionSeatCount = 1;
		let subscriptionProvider = "manual";
		let pendingLinkedOrg: string | undefined;
		let insertCalled = false;
		let subscriptionUpdateCount = 0;

		const tx = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [pendingRow],
					}),
				}),
			}),
			update: () => ({
				set: (values: Record<string, unknown>) => ({
					where: async () => {
						if ("planId" in values) {
							subscriptionUpdateCount += 1;
							subscriptionPlanId = values.planId as string;
							subscriptionSeatCount = values.seatCount as number;
							subscriptionProvider = values.provider as string;
						}
						if ("linkedOrganizationId" in values) {
							pendingLinkedOrg = values.linkedOrganizationId as string;
						}
					},
				}),
			}),
			insert: () => {
				insertCalled = true;
				return { values: async () => [] };
			},
		};

		const { attachPendingOrgBillingOnCreateWithTx } = await import(
			"@/lib/domains/platform-access/registration"
		);

		const attached = await attachPendingOrgBillingOnCreateWithTx(tx as never, {
			creatorWallet: wallet,
			organizationId: orgId,
			pendingBillingId: pendingId,
			isPersonalOrg: false,
		});

		expect(attached).toBe(true);
		expect(insertCalled).toBe(false);
		expect(subscriptionUpdateCount).toBe(1);
		expect(subscriptionPlanId).toBe("teams");
		expect(subscriptionSeatCount).toBe(3);
		expect(subscriptionProvider).toBe("dodo");
		expect(pendingLinkedOrg).toBe(orgId);
	});

	test("rejects Solo attach on non-personal org", async () => {
		const pendingRow = {
			id: pendingId,
			linkedWallet: wallet,
			status: "linked",
			linkedOrganizationId: null,
			dodoSubscriptionId: "sub_solo",
			dodoCustomerId: "cus_test",
			planId: "individual",
			seatCount: 1,
			billingInterval: "monthly",
		};

		let subscriptionUpdateCount = 0;

		const tx = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [pendingRow],
					}),
				}),
			}),
			update: () => ({
				set: () => ({
					where: async () => {
						subscriptionUpdateCount += 1;
					},
				}),
			}),
		};

		const { attachPendingOrgBillingOnCreateWithTx } = await import(
			"@/lib/domains/platform-access/registration"
		);

		const attached = await attachPendingOrgBillingOnCreateWithTx(tx as never, {
			creatorWallet: wallet,
			organizationId: orgId,
			pendingBillingId: pendingId,
			isPersonalOrg: false,
		});

		expect(attached).toBe(false);
		expect(subscriptionUpdateCount).toBe(0);
	});
});

describe("getNewWorkspacePendingStatus", () => {
	const expiresAt = new Date("2027-01-01T00:00:00.000Z");
	const pendingRowBase = {
		id: pendingId,
		linkedWallet: wallet,
		linkedOrganizationId: null,
		planId: "teams",
		expiresAt,
	};

	beforeAll(() => {
		restoreTestEnvMock();
	});

	afterAll(() => {
		restoreTestEnvMock();
	});

	test("reports ready when pending row has subscription id", async () => {
		mock.module("@/lib/platform/db", () => ({
			default: {
				select: () => ({
					from: () => ({
						where: () => ({
							limit: async () => [
								{
									...pendingRowBase,
									status: "linked",
									dodoSubscriptionId: "sub_ready",
									dodoCheckoutSessionId: null,
								},
							],
						}),
					}),
				}),
				update: () => ({
					set: () => ({
						where: async () => undefined,
					}),
				}),
			},
		}));

		const { getNewWorkspacePendingStatus } = await import(
			"@/lib/domains/billing/utils/new-workspace-pending"
		);

		const status = await getNewWorkspacePendingStatus({
			wallet,
			pendingBillingId: pendingId,
		});

		expect(status.ready).toBe(true);
		expect(status.abandoned).toBe(false);
		expect(status.planId).toBe("teams");
		expect(status.expiresAt).toBe(expiresAt.toISOString());

		mock.restore();
		restoreTestEnvMock();
	});

	test("reports abandoned when Dodo checkout session was cancelled", async () => {
		const checkoutRetrieveMock = mock(async () => ({
			status: "cancelled",
			subscription_id: null,
		}));

		let pendingStatus = "linked";

		mock.module("@/lib/domains/billing/utils/policy", () => ({
			requireDodoApiKey: () => "test-key",
			createDodoClient: () => ({
				checkoutSessions: {
					retrieve: checkoutRetrieveMock,
				},
			}),
		}));

		mock.module("@/lib/platform/db", () => ({
			default: {
				select: () => ({
					from: () => ({
						where: () => ({
							limit: async () => [
								{
									...pendingRowBase,
									status: pendingStatus,
									dodoSubscriptionId: null,
									dodoCheckoutSessionId: "cs_cancelled",
								},
							],
						}),
					}),
				}),
				update: () => ({
					set: (values: Record<string, unknown>) => ({
						where: async () => {
							if (values.status === "expired") {
								pendingStatus = "expired";
							}
						},
					}),
				}),
			},
		}));

		const { getNewWorkspacePendingStatus } = await import(
			"@/lib/domains/billing/utils/new-workspace-pending"
		);

		const status = await getNewWorkspacePendingStatus({
			wallet,
			pendingBillingId: pendingId,
		});

		expect(status.ready).toBe(false);
		expect(status.abandoned).toBe(true);
		expect(checkoutRetrieveMock).toHaveBeenCalled();

		mock.restore();
		restoreTestEnvMock();
	});
});
