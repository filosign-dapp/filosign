import { beforeEach, describe, expect, mock, test } from "bun:test";
import { getAddress } from "viem";
import { dbQueryResult } from "../support/db-query-result";
import { testEnvStub } from "../support/env-stub";
import {
	ALLOWED_ORIGIN,
	REGISTERED_SENDER,
	readRequest,
	sponsorRequest,
	TEST_CHAIN_ID,
	testAllowedOrigins,
} from "../support/mock-pimlico-proxy";
import { createMockRedis } from "../support/mock-redis";

// Re-register before dynamic import: safe-link.test.ts mocks @/config without http.cors.
mock.module("@/config", () => ({
	default: {
		runtimeChain: { id: TEST_CHAIN_ID },
		http: {
			cors: {
				origin: [...testAllowedOrigins],
			},
		},
	},
}));

mock.module("@/env", () => ({
	default: testEnvStub,
}));

function mockFetch(
	impl: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>,
) {
	return Object.assign(mock(impl), {
		preconnect: () => {},
	}) as typeof fetch;
}

const mockRedis = createMockRedis();
const redisClient = {
	...mockRedis.client,
	incr: async (key: string) => {
		const current = Number.parseInt(mockRedis.store.get(key) ?? "0", 10);
		const next = current + 1;
		mockRedis.store.set(key, String(next));
		return next;
	},
	expire: async (_key: string, _ttl: number) => 1,
};

mock.module("@/lib/platform/cache/session", () => ({
	getRedis: () => redisClient,
}));

let registeredSenders = new Set<string>([REGISTERED_SENDER]);

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: {
			users: {
				walletAddress: "walletAddress",
			},
		},
		select: () => ({
			from: () => ({
				where: () => ({
					limit: () =>
						dbQueryResult(
							registeredSenders.has(REGISTERED_SENDER)
								? [{ walletAddress: REGISTERED_SENDER }]
								: [],
						),
				}),
			}),
		}),
	},
}));

const {
	JSON_RPC_ERROR_CODES,
	makeJsonRpcError,
	parseJsonRpcBody,
	classifyPimlicoMethod,
	extractUserOpSender,
	assertAllowedIntegrationOrigin,
	isAllowedIntegrationOrigin,
	resolveRequestOrigin,
	assertRegisteredSender,
	handlePimlicoProxyRequest,
	PimlicoProxyError,
} = await import("@/lib/platform/pimlico-proxy");

const { assertPimlicoProxyRateLimit } = await import(
	"@/lib/platform/cache/pimlico-proxy-rate-limit"
);

beforeEach(() => {
	mockRedis.store.clear();
	registeredSenders = new Set([REGISTERED_SENDER]);
	mock.module("@/lib/platform/cache/session", () => ({
		getRedis: () => redisClient,
	}));
});

describe("makeJsonRpcError", () => {
	test("returns JSON-RPC 2.0 error shape", () => {
		const error = makeJsonRpcError(1, -32601, "Method not allowed");
		expect(error).toEqual({
			jsonrpc: "2.0",
			id: 1,
			error: { code: -32601, message: "Method not allowed" },
		});
	});
});

describe("parseJsonRpcBody", () => {
	test("accepts a single JSON-RPC object", () => {
		const request = readRequest();
		const parsed = parseJsonRpcBody(request);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(parsed.value.isBatch).toBe(false);
		expect(parsed.value.requests).toHaveLength(1);
		expect(parsed.value.requests[0]?.method).toBe("eth_chainId");
	});

	test("accepts a JSON-RPC batch array", () => {
		const parsed = parseJsonRpcBody([
			readRequest("eth_chainId", 1),
			readRequest("eth_supportedEntryPoints", 2),
		]);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(parsed.value.isBatch).toBe(true);
		expect(parsed.value.requests).toHaveLength(2);
	});

	test("rejects invalid batch items", () => {
		const parsed = parseJsonRpcBody([{ jsonrpc: "2.0", method: "", id: 3 }]);
		expect(parsed.ok).toBe(false);
	});
});

describe("classifyPimlicoMethod", () => {
	test("allows sponsor and read methods from the matrix", () => {
		expect(classifyPimlicoMethod("pm_sponsorUserOperation")).toBe("sponsor");
		expect(classifyPimlicoMethod("eth_getUserOperationReceipt")).toBe("read");
		expect(classifyPimlicoMethod("eth_chainId")).toBe("read");
	});

	test("rejects unknown methods", () => {
		expect(classifyPimlicoMethod("eth_blockNumber")).toBeNull();
	});
});

describe("extractUserOpSender", () => {
	test("returns checksummed sender from UserOperation params", () => {
		expect(
			extractUserOpSender([
				{ sender: "0x1111111111111111111111111111111111111111" },
			]),
		).toBe(REGISTERED_SENDER);
	});

	test("returns null for missing or invalid sender", () => {
		expect(extractUserOpSender([{}])).toBeNull();
		expect(extractUserOpSender(undefined)).toBeNull();
		expect(extractUserOpSender([{ sender: "not-an-address" }])).toBeNull();
	});
});

describe("integration origin", () => {
	test("accepts allowed Origin header", () => {
		expect(
			isAllowedIntegrationOrigin({
				requestOrigin: ALLOWED_ORIGIN,
				allowedOrigins: testAllowedOrigins,
			}),
		).toBe(true);
	});

	test("rejects unknown origins", () => {
		expect(
			isAllowedIntegrationOrigin({
				requestOrigin: "https://evil.example",
				allowedOrigins: testAllowedOrigins,
			}),
		).toBe(false);
	});

	test("falls back to Referer when Origin is absent", () => {
		expect(
			resolveRequestOrigin({
				origin: undefined,
				referer: `${ALLOWED_ORIGIN}/dashboard`,
			}),
		).toBe(ALLOWED_ORIGIN);
	});

	test("assertAllowedIntegrationOrigin throws for disallowed origin", () => {
		expect(() =>
			assertAllowedIntegrationOrigin({
				origin: "https://evil.example",
				referer: undefined,
				allowedOrigins: testAllowedOrigins,
			}),
		).toThrow(PimlicoProxyError);
	});
});

describe("assertRegisteredSender", () => {
	test("passes when wallet exists in users table", async () => {
		await expect(
			assertRegisteredSender({
				sender: REGISTERED_SENDER,
				requestId: 1,
			}),
		).resolves.toBeUndefined();
	});

	test("throws JSON-RPC -32000 when wallet is not registered", async () => {
		registeredSenders = new Set();
		try {
			await assertRegisteredSender({
				sender: getAddress("0x2222222222222222222222222222222222222222"),
				requestId: 9,
			});
			throw new Error("expected rejection");
		} catch (error) {
			expect(error).toBeInstanceOf(PimlicoProxyError);
			if (error instanceof PimlicoProxyError) {
				expect(error.response.error.code).toBe(
					JSON_RPC_ERROR_CODES.unregisteredSender,
				);
				expect(error.response.id).toBe(9);
			}
		}
	});
});

describe("assertPimlicoProxyRateLimit", () => {
	test("throws after the per-minute cap", async () => {
		for (let i = 0; i < 30; i += 1) {
			await assertPimlicoProxyRateLimit({
				sender: REGISTERED_SENDER,
				clientIp: "203.0.113.10",
				requestId: 1,
			});
		}

		await expect(
			assertPimlicoProxyRateLimit({
				sender: REGISTERED_SENDER,
				clientIp: "203.0.113.10",
				requestId: 1,
			}),
		).rejects.toBeInstanceOf(PimlicoProxyError);
	});
});

describe("handlePimlicoProxyRequest", () => {
	const baseDeps = {
		chainKey: "testnet" as const,
		expectedChainId: TEST_CHAIN_ID,
		pimlicoApiKey: "test-pimlico-key",
		sponsorshipEnabled: true,
		allowedOrigins: testAllowedOrigins,
		fetchImpl: mockFetch(async () => new Response("{}")),
		assertRateLimit: async () => {},
	};

	test("rejects disallowed origin before forwarding", async () => {
		const result = await handlePimlicoProxyRequest({
			chainIdParam: String(TEST_CHAIN_ID),
			origin: "https://evil.example",
			referer: undefined,
			body: readRequest(),
			clientIp: "203.0.113.10",
			deps: baseDeps,
		});

		expect(result.httpStatus).toBe(403);
		expect(result.bodyText).toContain("Request origin is not allowed");
	});

	test("rejects unknown JSON-RPC methods", async () => {
		const result = await handlePimlicoProxyRequest({
			chainIdParam: String(TEST_CHAIN_ID),
			origin: ALLOWED_ORIGIN,
			referer: undefined,
			body: {
				jsonrpc: "2.0",
				method: "eth_blockNumber",
				params: [],
				id: 1,
			},
			clientIp: "203.0.113.10",
			deps: baseDeps,
		});

		expect(result.httpStatus).toBe(400);
		expect(result.bodyText).toContain("Method not allowed");
	});

	test("rejects sponsor methods for unregistered senders", async () => {
		registeredSenders = new Set();
		const result = await handlePimlicoProxyRequest({
			chainIdParam: String(TEST_CHAIN_ID),
			origin: ALLOWED_ORIGIN,
			referer: undefined,
			body: sponsorRequest("pm_sponsorUserOperation", 4),
			clientIp: "203.0.113.10",
			deps: baseDeps,
		});

		expect(result.httpStatus).toBe(403);
		expect(result.bodyText).toContain("not registered");
	});

	test("forwards allowed read methods without sender validation", async () => {
		const fetchImpl = mockFetch(async () =>
			Response.json({ jsonrpc: "2.0", id: 1, result: "0x14a34" }),
		);

		const result = await handlePimlicoProxyRequest({
			chainIdParam: String(TEST_CHAIN_ID),
			origin: ALLOWED_ORIGIN,
			referer: undefined,
			body: readRequest(),
			clientIp: "203.0.113.10",
			deps: {
				...baseDeps,
				fetchImpl,
			},
		});

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(result.httpStatus).toBe(200);
		expect(result.bodyText).toContain("0x14a34");
	});

	test("forwards sponsor methods for registered senders", async () => {
		const fetchMock = mock(async () =>
			Response.json({ jsonrpc: "2.0", id: 1, result: "0xabc" }),
		);
		const fetchImpl = mockFetch(fetchMock);

		const result = await handlePimlicoProxyRequest({
			chainIdParam: String(TEST_CHAIN_ID),
			origin: ALLOWED_ORIGIN,
			referer: undefined,
			body: sponsorRequest(),
			clientIp: "203.0.113.10",
			deps: {
				...baseDeps,
				fetchImpl,
			},
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const firstCall = fetchMock.mock.calls[0];
		expect(firstCall).toBeDefined();
		const [url, init] = firstCall as unknown as [string, RequestInit];
		expect(url).toContain(`https://api.pimlico.io/v2/${TEST_CHAIN_ID}/rpc`);
		expect(url).toContain("apikey=test-pimlico-key");
		expect(init.body).toBe(JSON.stringify(sponsorRequest()));
		expect(result.bodyText).toContain("0xabc");
	});

	test("rejects batch when any method is disallowed", async () => {
		const fetchImpl = mockFetch(async () => new Response("{}"));
		const result = await handlePimlicoProxyRequest({
			chainIdParam: String(TEST_CHAIN_ID),
			origin: ALLOWED_ORIGIN,
			referer: undefined,
			body: [
				readRequest("eth_chainId", 1),
				{
					jsonrpc: "2.0",
					method: "eth_blockNumber",
					params: [],
					id: 2,
				},
			],
			clientIp: "203.0.113.10",
			deps: {
				...baseDeps,
				fetchImpl,
			},
		});

		expect(fetchImpl).toHaveBeenCalledTimes(0);
		expect(result.httpStatus).toBe(400);
		expect(result.bodyText).toContain("Method not allowed");
	});

	test("forwards valid batch requests unchanged", async () => {
		const batch = [
			readRequest("eth_chainId", 1),
			readRequest("eth_supportedEntryPoints", 2),
		];
		const fetchMock = mock(async () =>
			Response.json([
				{ jsonrpc: "2.0", id: 1, result: "0x14a34" },
				{
					jsonrpc: "2.0",
					id: 2,
					result: ["0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"],
				},
			]),
		);
		const fetchImpl = mockFetch(fetchMock);

		const result = await handlePimlicoProxyRequest({
			chainIdParam: String(TEST_CHAIN_ID),
			origin: ALLOWED_ORIGIN,
			referer: undefined,
			body: batch,
			clientIp: "203.0.113.10",
			deps: {
				...baseDeps,
				fetchImpl,
			},
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const firstCall = fetchMock.mock.calls[0];
		expect(firstCall).toBeDefined();
		const [, init] = firstCall as unknown as [string, RequestInit];
		expect(init.body).toBe(JSON.stringify(batch));
		expect(result.httpStatus).toBe(200);
	});
});
