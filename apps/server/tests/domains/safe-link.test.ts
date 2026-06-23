import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import type * as FilosignShared from "@filosign/shared";
import type * as Viem from "viem";
import type { Address, Hex } from "viem";
import type * as EvmPlatform from "@/lib/platform/evm";
import { loadImplementation } from "../support/load-implementation";

const viem = loadImplementation<typeof Viem>("viem");
const shared = loadImplementation<typeof FilosignShared>("@filosign/shared");
const evm = loadImplementation<typeof EvmPlatform>("../../lib/platform/evm.ts");

const SAFE = "0x00000000000000000000000000000000000000a1" as Address;
const ORG_ID = "00000000-0000-7000-8000-000000000001";
const TIMESTAMP = 1_700_000_000;
const SIGNATURE = `0x${"11".repeat(65)}` as Hex;
const TYPED_HASH = `0x${"22".repeat(32)}` as Hex;
const SAFE_MESSAGE_HASH = `0x${"33".repeat(32)}` as Hex;
const PREPARED_SIGNATURE = `0x${"44".repeat(65)}` as Hex;

const readContractMock = mock(
	async (_args: { functionName: string; args?: unknown[] }): Promise<unknown> =>
		"0x00000000",
);

mock.module("viem", () => ({
	...viem,
	createPublicClient: () => ({
		readContract: (args: { functionName: string; args?: unknown[] }) =>
			readContractMock(args),
	}),
	verifyTypedData: async () => true,
	hashTypedData: () => TYPED_HASH,
}));

mock.module("@/config", () => ({
	default: {
		runtimeChain: { id: 84_532 },
		http: { cors: { origin: ["https://app.example.com"] } },
	},
}));

mock.module("@/lib/platform/evm", () => ({
	...evm,
	fsContracts: {
		...evm.fsContracts,
		FSEnvelopeRegistry: {
			address: "0x0000000000000000000000000000000000000abc",
		},
	},
}));

mock.module("@filosign/shared", () => ({
	...shared,
	safeTransactionServiceUrlForChainId: (chainId: number) =>
		chainId === 84_532
			? "https://safe-transaction-base-sepolia.safe.global"
			: null,
}));

describe("safe-link validation", () => {
	const originalFetch = globalThis.fetch;

	beforeAll(() => {
		globalThis.fetch = Object.assign(
			mock(async () => new Response(null, { status: 404 })),
			{ preconnect: originalFetch.preconnect?.bind(originalFetch) },
		) as typeof fetch;
	});

	afterAll(() => {
		globalThis.fetch = originalFetch;
	});

	test("validateLinkOrgWalletSignature accepts valid EOA typed data", async () => {
		const { validateLinkOrgWalletSignature } = await import(
			"@/lib/domains/orgs/utils/link-wallet"
		);
		const valid = await validateLinkOrgWalletSignature({
			walletAddress: SAFE,
			organizationId: ORG_ID,
			timestamp: TIMESTAMP,
			signature: SIGNATURE,
		});
		expect(valid).toBe(true);
	});

	test("validateSafeLinkOrgWalletSignature accepts EIP-1271 magic value", async () => {
		readContractMock.mockImplementation(async (args) => {
			if (args.functionName === "isValidSignature") {
				return "0x1626ba7e";
			}
			return 1n;
		});

		const { validateSafeLinkOrgWalletSignature } = await import(
			"@/lib/domains/orgs/utils/link-wallet"
		);
		const valid = await validateSafeLinkOrgWalletSignature({
			walletAddress: SAFE,
			organizationId: ORG_ID,
			timestamp: TIMESTAMP,
			signature: SIGNATURE,
		});
		expect(valid).toBe(true);
	});

	test("validateSafeLinkOrgWalletSignature accepts Safe Transaction Service prepared signature", async () => {
		let isValidCalls = 0;
		readContractMock.mockImplementation(async (args) => {
			if (args.functionName === "isValidSignature") {
				isValidCalls += 1;
				return isValidCalls === 1 ? "0x00000000" : "0x1626ba7e";
			}
			if (args.functionName === "getThreshold") {
				return 2n;
			}
			if (args.functionName === "getMessageHash") {
				return SAFE_MESSAGE_HASH;
			}
			return 0n;
		});

		globalThis.fetch = Object.assign(
			mock(async () =>
				Response.json({
					confirmationsSubmitted: 2,
					preparedSignature: PREPARED_SIGNATURE,
				}),
			),
			{ preconnect: originalFetch.preconnect?.bind(originalFetch) },
		) as typeof fetch;

		const { validateSafeLinkOrgWalletSignature } = await import(
			"@/lib/domains/orgs/utils/link-wallet"
		);

		const valid = await validateSafeLinkOrgWalletSignature({
			walletAddress: SAFE,
			organizationId: ORG_ID,
			timestamp: TIMESTAMP,
			signature: SIGNATURE,
			safeMessageHash: SAFE_MESSAGE_HASH,
		});
		expect(valid).toBe(true);
	});

	test("validateSafeLinkOrgWalletSignature rejects mismatched safe message hash", async () => {
		readContractMock.mockImplementation(async (args) => {
			if (args.functionName === "isValidSignature") {
				return "0x00000000";
			}
			if (args.functionName === "getThreshold") {
				return 1n;
			}
			if (args.functionName === "getMessageHash") {
				return `0x${"99".repeat(32)}` as Hex;
			}
			return 0n;
		});

		const { validateSafeLinkOrgWalletSignature } = await import(
			"@/lib/domains/orgs/utils/link-wallet"
		);

		const valid = await validateSafeLinkOrgWalletSignature({
			walletAddress: SAFE,
			organizationId: ORG_ID,
			timestamp: TIMESTAMP,
			signature: SIGNATURE,
			safeMessageHash: SAFE_MESSAGE_HASH,
		});
		expect(valid).toBe(false);
	});

	test("validateSafeLinkOrgWalletSignature rejects insufficient confirmations", async () => {
		readContractMock.mockImplementation(async (args) => {
			if (args.functionName === "isValidSignature") {
				return "0x00000000";
			}
			if (args.functionName === "getThreshold") {
				return 2n;
			}
			if (args.functionName === "getMessageHash") {
				return SAFE_MESSAGE_HASH;
			}
			return 0n;
		});

		globalThis.fetch = Object.assign(
			mock(async () =>
				Response.json({
					confirmationsSubmitted: 1,
					preparedSignature: PREPARED_SIGNATURE,
				}),
			),
			{ preconnect: originalFetch.preconnect?.bind(originalFetch) },
		) as typeof fetch;

		const { validateSafeLinkOrgWalletSignature } = await import(
			"@/lib/domains/orgs/utils/link-wallet"
		);

		const valid = await validateSafeLinkOrgWalletSignature({
			walletAddress: SAFE,
			organizationId: ORG_ID,
			timestamp: TIMESTAMP,
			signature: SIGNATURE,
			safeMessageHash: SAFE_MESSAGE_HASH,
		});
		expect(valid).toBe(false);
	});
});
