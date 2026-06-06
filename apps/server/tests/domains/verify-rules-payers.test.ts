import { afterAll, describe, expect, mock, test } from "bun:test";
import { getAddress } from "viem";
import { dbQueryResult } from "../support/db-query-result";

const sender = "0x1111111111111111111111111111111111111111" as const;
const treasury = "0x2222222222222222222222222222222222222222" as const;
const otherWallet = "0x3333333333333333333333333333333333333333" as const;
const orgId = "00000000-0000-7000-8000-000000000088";

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: { organizations: {} },
		select: () => ({
			from: () => ({
				where: () => ({
					limit: () =>
						dbQueryResult([{ orgWalletAddress: getAddress(treasury) }]),
				}),
			}),
		}),
	},
}));

afterAll(() => {
	mock.restore();
});

describe("resolveAllowedSettlementPayers", () => {
	test("includes sender and linked org treasury", async () => {
		const { resolveAllowedSettlementPayers } = await import(
			"@/lib/domains/settlements/utils/verify/rules-on-chain"
		);

		const allowed = await resolveAllowedSettlementPayers(sender, orgId);

		expect(allowed.has(getAddress(sender).toLowerCase())).toBe(true);
		expect(allowed.has(getAddress(treasury).toLowerCase())).toBe(true);
		expect(allowed.has(getAddress(otherWallet).toLowerCase())).toBe(false);
		expect(allowed.size).toBe(2);
	});

	test("sender only when organizationId omitted", async () => {
		const { resolveAllowedSettlementPayers } = await import(
			"@/lib/domains/settlements/utils/verify/rules-on-chain"
		);

		const allowed = await resolveAllowedSettlementPayers(sender, null);

		expect(allowed.size).toBe(1);
		expect(allowed.has(getAddress(sender).toLowerCase())).toBe(true);
	});
});
