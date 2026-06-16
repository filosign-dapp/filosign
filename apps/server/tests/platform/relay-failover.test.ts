import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { ORPCError } from "@orpc/server";
import { testEnvStub } from "../support/env-stub";

afterAll(() => {
	mock.restore();
});

function stubRelayerEnv() {
	mock.module("@/env", () => ({ default: testEnvStub }));
}

describe("isRelayerRelayRetryable", () => {
	beforeEach(() => {
		stubRelayerEnv();
	});

	test("treats on-chain revert as retryable", async () => {
		const { isRelayerRelayRetryable } = await import(
			"@/lib/platform/evm/relay-failover"
		);
		expect(
			isRelayerRelayRetryable(
				new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "registerEnvelope reverted on-chain",
				}),
			),
		).toBe(true);
	});

	test("treats relayer lock timeout as retryable", async () => {
		const { isRelayerRelayRetryable } = await import(
			"@/lib/platform/evm/relay-failover"
		);
		expect(
			isRelayerRelayRetryable(
				new Error("relayer lock unavailable after retries"),
			),
		).toBe(true);
	});

	test("treats insufficient funds as retryable", async () => {
		const { isRelayerRelayRetryable } = await import(
			"@/lib/platform/evm/relay-failover"
		);
		expect(
			isRelayerRelayRetryable(
				new Error("insufficient funds for gas * price + value"),
			),
		).toBe(true);
	});

	test("treats RelayerRelayFailoverError as retryable", async () => {
		const { isRelayerRelayRetryable, RelayerRelayFailoverError } = await import(
			"@/lib/platform/evm/relay-failover"
		);
		expect(
			isRelayerRelayRetryable(
				new RelayerRelayFailoverError("relay leg failed"),
			),
		).toBe(true);
	});

	test("does not treat signature errors as retryable", async () => {
		const { isRelayerRelayRetryable } = await import(
			"@/lib/platform/evm/relay-failover"
		);
		expect(
			isRelayerRelayRetryable(new Error("SIGNING.SIGNATURE_INVALID")),
		).toBe(false);
	});
});

describe("withRelayerPoolFailover", () => {
	beforeEach(() => {
		stubRelayerEnv();
	});

	test("returns first relayer result on success", async () => {
		const { parseRelayerPool, resetRelayerPoolCacheForTests } = await import(
			"@/lib/platform/evm/relayer-pool"
		);
		const { withRelayerPoolFailover } = await import(
			"@/lib/platform/evm/relay-failover"
		);

		resetRelayerPoolCacheForTests();
		const primary = parseRelayerPool()[0];
		const out = await withRelayerPoolFailover({
			primary,
			step: "test",
			run: async (member) => `ok:${member.index}`,
		});
		expect(out.result).toBe("ok:0");
		expect(out.relayer.address).toBe(primary.address);
	});

	test("failsover to second relayer on retryable error", async () => {
		const { parseRelayerPool, resetRelayerPoolCacheForTests } = await import(
			"@/lib/platform/evm/relayer-pool"
		);
		const { withRelayerPoolFailover } = await import(
			"@/lib/platform/evm/relay-failover"
		);

		resetRelayerPoolCacheForTests();
		const pool = parseRelayerPool();
		const primary = pool[0];
		const secondary = pool[1];
		const attempts: string[] = [];

		const out = await withRelayerPoolFailover({
			primary,
			step: "registerEnvelope",
			run: async (member) => {
				attempts.push(member.address);
				if (member.index === 0) {
					throw new Error("registerEnvelope reverted on-chain");
				}
				return "0xabc" as `0x${string}`;
			},
		});

		expect(attempts).toEqual([primary.address, secondary.address]);
		expect(out.result).toBe("0xabc");
		expect(out.relayer.address).toBe(secondary.address);
	});

	test("rethrows immediately on non-retryable error", async () => {
		const { parseRelayerPool, resetRelayerPoolCacheForTests } = await import(
			"@/lib/platform/evm/relayer-pool"
		);
		const { withRelayerPoolFailover } = await import(
			"@/lib/platform/evm/relay-failover"
		);

		resetRelayerPoolCacheForTests();
		const primary = parseRelayerPool()[0];
		const attempts: string[] = [];

		await expect(
			withRelayerPoolFailover({
				primary,
				step: "registerEnvelope",
				run: async (member) => {
					attempts.push(member.address);
					throw new Error("Sender email required");
				},
			}),
		).rejects.toThrow("Sender email required");

		expect(attempts).toEqual([primary.address]);
	});

	test("rethrows last error when all pool members fail retryably", async () => {
		const { parseRelayerPool, resetRelayerPoolCacheForTests } = await import(
			"@/lib/platform/evm/relayer-pool"
		);
		const { withRelayerPoolFailover } = await import(
			"@/lib/platform/evm/relay-failover"
		);

		resetRelayerPoolCacheForTests();
		const primary = parseRelayerPool()[0];

		await expect(
			withRelayerPoolFailover({
				primary,
				step: "registerEnvelope",
				run: async () => {
					throw new Error("insufficient funds");
				},
			}),
		).rejects.toThrow("insufficient funds");
	});
});
