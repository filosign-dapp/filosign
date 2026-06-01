import { describe, expect, test } from "bun:test";
import { base, baseSepolia } from "viem/chains";
import {
	effectiveChainRpcPrimaryUrl,
	isLikelyRpcTransportError,
	publicRpcUrlForChain,
	resolveChainRpcHttpUrl,
	summarizeChainRpcConfig,
	warnIfChainRpcUrlIgnored,
} from "../chain-rpc";

describe("chain-rpc", () => {
	test("effectiveChainRpcPrimaryUrl is production only", () => {
		expect(
			effectiveChainRpcPrimaryUrl({
				deployment: "production",
				chainKey: "mainnet",
				primaryUrl: "https://rpc.example.com",
			}),
		).toBe("https://rpc.example.com");
		expect(
			effectiveChainRpcPrimaryUrl({
				deployment: "production",
				chainKey: "testnet",
				primaryUrl: "https://rpc.example.com",
			}),
		).toBe("https://rpc.example.com");
		expect(
			effectiveChainRpcPrimaryUrl({
				deployment: "staging",
				chainKey: "testnet",
				primaryUrl: "https://rpc.example.com",
			}),
		).toBeUndefined();
	});

	test("summarizeChainRpcConfig enables fallback only with production primary", () => {
		const withPrimary = summarizeChainRpcConfig({
			deployment: "production",
			chainKey: "mainnet",
			primaryUrl: "https://alchemy.example.com",
		});
		expect(withPrimary.dedicatedPrimary).toBe(true);
		expect(withPrimary.fallbackEnabled).toBe(true);
		expect(withPrimary.httpUrl).toBe("https://alchemy.example.com");
		expect(withPrimary.publicFallbackUrl).toBe(publicRpcUrlForChain(base));

		const productionTestnet = summarizeChainRpcConfig({
			deployment: "production",
			chainKey: "testnet",
			primaryUrl: "https://alchemy-sepolia.example.com",
		});
		expect(productionTestnet.fallbackEnabled).toBe(true);
		expect(productionTestnet.publicFallbackUrl).toBe(
			publicRpcUrlForChain(baseSepolia),
		);

		const staging = summarizeChainRpcConfig({
			deployment: "staging",
			chainKey: "testnet",
			primaryUrl: "https://alchemy.example.com",
		});
		expect(staging.dedicatedPrimary).toBe(false);
		expect(staging.fallbackEnabled).toBe(false);
	});

	test("resolveChainRpcHttpUrl returns primary or public default", () => {
		expect(
			resolveChainRpcHttpUrl({
				deployment: "production",
				chainKey: "mainnet",
				primaryUrl: "https://primary.example.com",
			}),
		).toBe("https://primary.example.com");
		expect(
			resolveChainRpcHttpUrl({
				deployment: "sandbox",
				chainKey: "testnet",
				primaryUrl: "https://ignored.example.com",
			}),
		).not.toBe("https://ignored.example.com");
	});

	test("isLikelyRpcTransportError detects rate limits and timeouts", () => {
		expect(isLikelyRpcTransportError(new Error("429 rate limit"))).toBe(true);
		expect(isLikelyRpcTransportError({ status: 503 })).toBe(true);
		expect(isLikelyRpcTransportError(new Error("user rejected"))).toBe(false);
	});

	test("warnIfChainRpcUrlIgnored logs for non-production when URL set", () => {
		const messages: string[] = [];
		warnIfChainRpcUrlIgnored({
			deployment: "staging",
			chainRpcUrl: "https://rpc.example.com",
			log: (m) => messages.push(m),
		});
		expect(messages).toHaveLength(1);
		warnIfChainRpcUrlIgnored({
			deployment: "production",
			chainRpcUrl: "https://rpc.example.com",
			log: (m) => messages.push(m),
		});
		expect(messages).toHaveLength(1);
	});
});
