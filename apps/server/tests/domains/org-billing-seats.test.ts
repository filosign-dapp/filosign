import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { dbQueryResult } from "../support/db-query-result";

const orgId = "00000000-0000-7000-8000-000000000001";
const subscriptionId = "sub_test_123";

const orgSubRow = {
	organizationId: orgId,
	planId: "teams_pro" as const,
	seatCount: 3,
	status: "active" as const,
	billingInterval: "yearly" as const,
	dodoSubscriptionId: subscriptionId,
	dodoCustomerId: "cus_test",
	cancelAtPeriodEnd: false,
	periodEnd: null,
	featureOverrides: {},
};

const changePlanMock = mock(async () => {});
const retrieveMock = mock(async () => ({ quantity: 2 }));
const previewChangePlanMock = mock(async () => ({
	immediate_charge: {
		effective_at: "2026-06-01T12:00:00.000Z",
		summary: { total_amount: 100, currency: "USD" },
	},
	new_plan: { quantity: 3 },
}));

const dbUpdates: unknown[] = [];
let selectQueue: unknown[][] = [];

mock.module("@/lib/domains/billing/utils/policy", () => {
	return {
		requireDodoApiKey: () => "test-key",
		createDodoClient: () => ({
			subscriptions: {
				retrieve: retrieveMock,
				changePlan: changePlanMock,
				previewChangePlan: previewChangePlanMock,
			},
		}),
		isWorkspaceBillingPlanId: (planId: string) => {
			return (
				planId === "individual" || planId === "teams" || planId === "teams_pro"
			);
		},
		isAllowedReturnUrlOrigin: () => true,
	};
});

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: {
			fileColdInvites: {},
			organizationInvites: {},
			userInvites: {},
			organizationMembers: {},
			organizationSubscriptions: {},
		},
		select: () => ({
			from: () => ({
				where: () => {
					const rows = selectQueue.shift() ?? [];
					return dbQueryResult(rows);
				},
			}),
		}),
		update: () => ({
			set: (values: unknown) => ({
				where: async () => {
					dbUpdates.push(values);
				},
			}),
		}),
	},
}));

afterAll(() => {
	mock.restore();
});

function queueOrgBillingSelects() {
	selectQueue = [[orgSubRow], [{ count: 1 }], [{ count: 1 }]];
}

describe("org seat changes", () => {
	beforeEach(() => {
		changePlanMock.mockClear();
		retrieveMock.mockClear();
		previewChangePlanMock.mockClear();
		dbUpdates.length = 0;
		selectQueue = [];
		orgSubRow.seatCount = 3;
		retrieveMock.mockImplementation(async () => ({ quantity: 2 }));
	});

	test("preview rejects target equal to live Dodo quantity", async () => {
		queueOrgBillingSelects();
		const { previewOrgSeatChange } = await import(
			"@/lib/domains/billing/utils/org"
		);

		await expect(
			previewOrgSeatChange({ organizationId: orgId, seatCount: 2 }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: "Workspace is already on 2 seats",
		});
		expect(previewChangePlanMock).not.toHaveBeenCalled();
	});

	test("updateOrgSeats calls changePlan when DB lags behind Dodo", async () => {
		queueOrgBillingSelects();
		let retrieveCall = 0;
		retrieveMock.mockImplementation(async () => {
			retrieveCall++;
			return { quantity: retrieveCall === 1 ? 2 : 3 };
		});
		const { updateOrgSeats } = await import("@/lib/domains/billing/utils/org");

		const result = await updateOrgSeats({
			organizationId: orgId,
			seatCount: 3,
		});

		expect(result).toEqual({
			seatCount: 3,
			changed: true,
			pendingPayment: false,
		});
		expect(changePlanMock).toHaveBeenCalledTimes(1);
		expect(dbUpdates).toContainEqual({
			seatCount: 3,
			updatedAt: expect.any(Date),
		});
	});

	test("updateOrgSeats no-ops when target matches Dodo and syncs stale DB", async () => {
		queueOrgBillingSelects();
		const { updateOrgSeats } = await import("@/lib/domains/billing/utils/org");

		const result = await updateOrgSeats({
			organizationId: orgId,
			seatCount: 2,
		});

		expect(result).toEqual({
			seatCount: 2,
			changed: false,
			pendingPayment: false,
		});
		expect(changePlanMock).not.toHaveBeenCalled();
		expect(dbUpdates).toContainEqual({
			seatCount: 2,
			updatedAt: expect.any(Date),
		});
	});

	test("updateOrgSeats reports pending payment when Dodo quantity unchanged after increase", async () => {
		queueOrgBillingSelects();
		retrieveMock.mockImplementation(async () => ({ quantity: 2 }));
		const { updateOrgSeats } = await import("@/lib/domains/billing/utils/org");

		const result = await updateOrgSeats({
			organizationId: orgId,
			seatCount: 3,
		});

		expect(result).toEqual({
			seatCount: 2,
			changed: false,
			pendingPayment: true,
		});
		expect(changePlanMock).toHaveBeenCalledTimes(1);
	});
});

describe("preview seat change response", () => {
	beforeEach(() => {
		previewChangePlanMock.mockClear();
		retrieveMock.mockImplementation(async () => ({ quantity: 3 }));
		selectQueue = [[orgSubRow], [{ count: 1 }], [{ count: 1 }]];
	});

	test("returns Dodo quantity as currentSeatCount with credit metadata", async () => {
		previewChangePlanMock.mockImplementation(async () => ({
			immediate_charge: {
				effective_at: "2026-06-01T12:00:00.000Z",
				summary: { total_amount: -100, currency: "USD" },
			},
			new_plan: { quantity: 2 },
		}));

		const { previewOrgSeatChange } = await import(
			"@/lib/domains/billing/utils/org"
		);

		const preview = await previewOrgSeatChange({
			organizationId: orgId,
			seatCount: 2,
		});

		expect(preview.currentSeatCount).toBe(3);
		expect(preview.seatCount).toBe(2);
		expect(preview.deltaSeatCount).toBe(-1);
		expect(preview.isCredit).toBe(true);
		expect(preview.immediateChargeCents).toBe(-100);
	});
});
