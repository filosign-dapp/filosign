import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test";
import type { Address } from "viem";
import { dbQueryResult } from "../support/db-query-result";
import { testEnvStub } from "../support/env-stub";

const adminWallet = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Address;
const requestId = "00000000-0000-7000-8000-000000000001";

describe("access request submit", () => {
	let pendingSelectRows: unknown[] = [];
	let insertedValues: unknown[] = [];
	let updatedSets: unknown[] = [];

	beforeAll(() => {
		mock.module("@/lib/platform/db", () => ({
			default: {
				select: () => ({
					from: () => ({
						where: () => ({
							limit: () => dbQueryResult(pendingSelectRows),
						}),
					}),
				}),
				insert: () => ({
					values: (values: unknown) => {
						insertedValues.push(values);
						return Promise.resolve();
					},
				}),
				update: () => ({
					set: (values: unknown) => ({
						where: async () => {
							updatedSets.push(values);
						},
					}),
				}),
			},
		}));
	});

	afterAll(() => {
		mock.restore();
	});

	beforeEach(() => {
		pendingSelectRows = [];
		insertedValues = [];
		updatedSets = [];
	});

	test("inserts plan and billing interval for a new request", async () => {
		const { submitAccessRequest } = await import(
			"@/lib/domains/platform-access/requests"
		);

		await submitAccessRequest({
			email: "user@example.com",
			planId: "teams_pro",
			interval: "yearly",
			seatCount: 1,
			company: "Acme",
		});

		expect(insertedValues).toHaveLength(1);
		expect(insertedValues[0]).toMatchObject({
			email: "user@example.com",
			planId: "teams_pro",
			billingInterval: "yearly",
			seatCount: 1,
			company: "Acme",
		});
	});

	test("updates pending request when email already has a pending row", async () => {
		pendingSelectRows = [{ id: requestId }];
		const { submitAccessRequest } = await import(
			"@/lib/domains/platform-access/requests"
		);

		await submitAccessRequest({
			email: "user@example.com",
			planId: "individual",
			interval: "monthly",
			message: "Updated",
		});

		expect(insertedValues).toHaveLength(0);
		expect(updatedSets).toHaveLength(1);
		expect(updatedSets[0]).toMatchObject({
			planId: "individual",
			billingInterval: "monthly",
			message: "Updated",
			seatCount: 1,
		});
	});
});

describe("access request approve", () => {
	const createCheckoutIntentAndEmail = mock(async () => ({
		checkoutIntentId: "00000000-0000-7000-8000-000000000099",
		continueUrl: "https://server.example.com/checkout/continue?token=abc",
	}));
	const assertMarketingCheckoutAllowed = mock(async () => {});

	let requestSelectRows: unknown[] = [];
	let approvedUpdate: unknown | null = null;

	beforeAll(() => {
		mock.module("@/lib/domains/billing/checkout-intents", () => ({
			createCheckoutIntentAndEmail,
			resolveCheckoutSeatCount: ({
				planId,
				seatCount,
			}: {
				planId: string;
				seatCount?: number;
			}) => {
				const count = seatCount ?? 1;
				if (planId === "individual" && count !== 1) {
					throw new Error("individual seats");
				}
				return count;
			},
		}));

		mock.module("@/lib/domains/billing/utils/marketing", () => ({
			assertMarketingCheckoutAllowed,
		}));

		mock.module("@/lib/platform/db", () => ({
			default: {
				select: () => ({
					from: () => ({
						where: () => ({
							limit: () => dbQueryResult(requestSelectRows),
						}),
					}),
				}),
				update: () => ({
					set: (values: unknown) => ({
						where: async () => {
							approvedUpdate = values;
						},
					}),
				}),
			},
		}));
	});

	afterAll(() => {
		mock.restore();
	});

	beforeEach(() => {
		requestSelectRows = [];
		approvedUpdate = null;
		createCheckoutIntentAndEmail.mockClear();
		assertMarketingCheckoutAllowed.mockClear();
	});

	test("sends checkout link for requested plan instead of partner trial", async () => {
		requestSelectRows = [
			{
				id: requestId,
				status: "pending",
				email: "user@example.com",
				planId: "individual",
				billingInterval: "monthly",
				seatCount: 1,
			},
		];

		const { approveAccessRequest } = await import(
			"@/lib/domains/platform-access/requests"
		);

		const result = await approveAccessRequest({
			adminWallet,
			requestId,
		});

		expect(result).toEqual({ ok: true });
		expect(assertMarketingCheckoutAllowed).toHaveBeenCalledWith({
			email: "user@example.com",
			planId: "individual",
		});
		expect(createCheckoutIntentAndEmail).toHaveBeenCalledWith({
			email: "user@example.com",
			planId: "individual",
			interval: "monthly",
			seatCount: 1,
		});
		expect(approvedUpdate).toMatchObject({
			status: "approved",
			createdCheckoutIntentId: "00000000-0000-7000-8000-000000000099",
		});
	});

	test("rejects approval when request has no paid plan", async () => {
		requestSelectRows = [
			{
				id: requestId,
				status: "pending",
				email: "user@example.com",
				planId: null,
				billingInterval: null,
				seatCount: 1,
			},
		];

		const { approveAccessRequest } = await import(
			"@/lib/domains/platform-access/requests"
		);

		await expect(
			approveAccessRequest({ adminWallet, requestId }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
		expect(createCheckoutIntentAndEmail).not.toHaveBeenCalled();
	});
});

describe("checkout intents when public checkout is disabled", () => {
	const checkoutCreate = mock(async () => ({
		session_id: "sess_1",
		url: "https://checkout.dodo.test/pay",
	}));
	const checkoutRetrieve = mock(async () => ({
		checkout_url: null as string | null,
		url: null as string | null,
	}));
	const sendCheckoutContinueEmail = mock(async () => {});
	let intentSelectRows: unknown[] = [];
	const testEnv = {
		...testEnvStub,
		DEPLOYMENT: "production" as const,
		PUBLIC_CHECKOUT_ENABLED: false,
	};

	beforeAll(() => {
		mock.module("@/env", () => ({ default: testEnv }));

		mock.module("@/lib/domains/billing/utils/policy", () => ({
			requireDodoApiKey: () => "test-key",
			createDodoClient: () => ({
				checkoutSessions: {
					create: checkoutCreate,
					retrieve: checkoutRetrieve,
				},
			}),
			isOrgBillingPlanId: (planId: string) =>
				planId === "teams" || planId === "teams_pro",
		}));

		mock.module("@/lib/platform/email", () => ({
			getServerUrl: () => "https://server.example.com",
			getClientUrl: () => "https://app.example.com",
			getAstroUrl: () => "https://astro.example.com",
			sendCheckoutContinueEmail,
			sendPaidSetupEmail: mock(async () => {}),
		}));

		mock.module("@/lib/platform/db", () => ({
			default: {
				select: () => ({
					from: () => ({
						where: () => ({
							limit: () => dbQueryResult(intentSelectRows),
						}),
					}),
				}),
				insert: () => ({
					values: () => ({
						returning: () =>
							Promise.resolve([{ id: "00000000-0000-7000-8000-000000000088" }]),
					}),
				}),
				update: () => ({
					set: () => ({
						where: async () => {},
					}),
				}),
			},
		}));
	});

	afterAll(() => {
		mock.restore();
	});

	beforeEach(() => {
		intentSelectRows = [];
		checkoutCreate.mockClear();
		sendCheckoutContinueEmail.mockClear();
	});

	test("requestCheckoutLink rejects when public checkout is disabled", async () => {
		const { requestCheckoutLink } = await import(
			"@/lib/domains/billing/checkout-intents"
		);

		await expect(
			requestCheckoutLink({
				email: "user@example.com",
				planId: "teams",
				interval: "yearly",
			}),
		).rejects.toMatchObject({ message: "Checkout unavailable" });
	});

	test("continueCheckoutFromToken still opens Dodo when public checkout is disabled", async () => {
		intentSelectRows = [
			{
				id: "00000000-0000-7000-8000-000000000088",
				continueToken: "continue-token-abc",
				setupToken: "setup-token",
				email: "user@example.com",
				planId: "teams_pro",
				billingInterval: "yearly",
				status: "pending",
				seatCount: 2,
				expiresAt: new Date(Date.now() + 60_000),
				dodoSessionId: null,
			},
		];

		const { continueCheckoutFromToken } = await import(
			"@/lib/domains/billing/checkout-intents"
		);

		const result = await continueCheckoutFromToken({
			token: "continue-token-abc",
		});

		expect(result).toEqual({ checkoutUrl: "https://checkout.dodo.test/pay" });
		expect(checkoutCreate).toHaveBeenCalled();
	});
});
