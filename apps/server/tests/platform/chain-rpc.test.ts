import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
	publicRpcUrlForChain,
	summarizeChainRpcConfig,
} from "@filosign/shared";
import type { Transport } from "viem";
import { base } from "viem/chains";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import {
	capturedTelegramEvents,
	clearCapturedTelegramEvents,
	flushPlatformAlerts,
	mockLoggerTelegramCapture,
} from "../support/platform-alerts";

mockLoggerTelegramCapture();
mock.module("@/env", () => ({
	default: {
		TG_ANALYTICS: true,
		TG_ANALYTICS_BOT_TOKEN: "test-bot-token",
		TG_ANALYTICS_BOT_GROUP_ID: "test-group-id",
	},
}));

describe("createServerChainRpcTransport", () => {
	test("production with primary uses fallback transport", async () => {
		const { createServerChainRpcTransport } = await import(
			"@/lib/platform/chain-rpc"
		);
		const { transport, summary } = createServerChainRpcTransport({
			deployment: "production",
			chainKey: "mainnet",
			primaryUrl: "https://primary-rpc.example.com",
		});
		expect(typeof transport).toBe("function");
		expect(summary.fallbackEnabled).toBe(true);
		expect(summary.httpUrl).toBe("https://primary-rpc.example.com");
		expect(summary.publicFallbackUrl).toBe(publicRpcUrlForChain(base));
	});

	test("staging ignores primary URL", async () => {
		const { createServerChainRpcTransport } = await import(
			"@/lib/platform/chain-rpc"
		);
		const { transport, summary } = createServerChainRpcTransport({
			deployment: "staging",
			chainKey: "testnet",
			primaryUrl: "https://primary-rpc.example.com",
		});
		expect(typeof transport).toBe("function");
		expect(summary.fallbackEnabled).toBe(false);
		expect(summary.dedicatedPrimary).toBe(false);
	});
});

describe("wrapChainRpcTransportObservability", () => {
	beforeEach(async () => {
		clearCapturedTelegramEvents();
		const { resetPlatformAlertsRuntimeForTests } = await import(
			"@/lib/platform/analytics/platform-alerts"
		);
		resetPlatformAlertsRuntimeForTests();
		const { resetChainRpcAlertDedupeForTests } = await import(
			"@/lib/platform/chain-rpc"
		);
		resetChainRpcAlertDedupeForTests();
	});

	test("emits server.rpc_degraded on likely RPC errors", async () => {
		const { wrapChainRpcTransportObservability } = await import(
			"@/lib/platform/chain-rpc"
		);
		const summary = summarizeChainRpcConfig({
			deployment: "production",
			chainKey: "mainnet",
			primaryUrl: "https://primary-rpc.example.com",
		});
		const inner = (() => ({
			config: { key: "mock" },
			name: "mock",
			request: async () => {
				throw Object.assign(new Error("429 rate limit exceeded"), {
					status: 429,
				});
			},
			value: {} as never,
		})) as unknown as Transport;
		const wrapped = wrapChainRpcTransportObservability(inner, summary);
		const transport = wrapped({ chain: base });

		await expect(
			transport.request({ method: "eth_blockNumber", params: [] }),
		).rejects.toThrow(/429/);

		await new Promise((resolve) => setTimeout(resolve, 20));
		await flushPlatformAlerts();
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.serverRpcDegraded,
		);
	});
});
