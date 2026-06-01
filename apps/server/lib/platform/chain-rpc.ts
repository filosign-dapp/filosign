import {
	type BuildChainRpcTransportArgs,
	type ChainRpcConfigSummary,
	effectiveChainRpcPrimaryUrl,
	isLikelyRpcTransportError,
	publicRpcUrlForChain,
	summarizeChainRpcConfig,
	viemChainForKey,
	warnIfChainRpcUrlIgnored,
} from "@filosign/shared";
import { fallback, http, type Transport } from "viem";

function buildChainRpcTransport(args: BuildChainRpcTransportArgs): Transport {
	const chain = viemChainForKey(args.chainKey);
	const publicUrl = publicRpcUrlForChain(chain);
	const primary = effectiveChainRpcPrimaryUrl(args);
	if (primary) {
		return fallback([http(primary), http(publicUrl)]);
	}
	return http(publicUrl);
}

import env from "@/env";

const RPC_ALERT_DEDUPE_MS = 5 * 60 * 1000;
let lastRpcAlertAt = 0;

async function emitRpcDegradedAlert(
	error: unknown,
	summary: ChainRpcConfigSummary,
): Promise<void> {
	const now = Date.now();
	if (now - lastRpcAlertAt < RPC_ALERT_DEDUPE_MS) return;
	lastRpcAlertAt = now;

	const message =
		error instanceof Error ? error.message : "JSON-RPC transport error";

	const [{ PLATFORM_ALERT_EVENTS }, { emitCriticalPlatformEvent }, { logger }] =
		await Promise.all([
			import("@/lib/platform/analytics/events"),
			import("@/lib/platform/analytics/platform-alerts"),
			import("@/lib/platform/pino"),
		]);

	logger.warn(
		{ err: error, rpc: summary.httpUrl, fallback: summary.fallbackEnabled },
		"chain RPC transport error",
	);
	void emitCriticalPlatformEvent({
		name: PLATFORM_ALERT_EVENTS.serverRpcDegraded,
		severity: "critical",
		message: "Chain JSON-RPC request failed",
		context: {
			rpcUrl: summary.httpUrl,
			fallbackEnabled: summary.fallbackEnabled,
			chainKey: summary.chainKey,
			error: message,
		},
	});
}

export function wrapChainRpcTransportObservability(
	transport: Transport,
	summary: ChainRpcConfigSummary,
): Transport {
	if (!summary.fallbackEnabled) return transport;

	return (opts) => {
		const inner = transport(opts);
		return {
			...inner,
			async request(args) {
				try {
					return await inner.request(args);
				} catch (error) {
					if (isLikelyRpcTransportError(error)) {
						void emitRpcDegradedAlert(error, summary);
					}
					throw error;
				}
			},
		};
	};
}

export function createServerChainRpcTransport(
	args: BuildChainRpcTransportArgs,
): { transport: Transport; summary: ChainRpcConfigSummary } {
	const summary = summarizeChainRpcConfig(args);
	const base = buildChainRpcTransport(args);
	const transport =
		args.deployment === "production" && summary.fallbackEnabled
			? wrapChainRpcTransportObservability(base, summary)
			: base;
	return { transport, summary };
}

/** Reset dedupe window for tests. */
export function resetChainRpcAlertDedupeForTests(): void {
	lastRpcAlertAt = 0;
}

export function serverChainRpcTransportArgs(): BuildChainRpcTransportArgs {
	warnIfChainRpcUrlIgnored({
		deployment: env.DEPLOYMENT,
		chainRpcUrl: env.CHAIN_RPC_URL,
		log: (message) => console.warn(message),
	});
	return {
		deployment: env.DEPLOYMENT,
		chainKey: env.CHAIN,
		primaryUrl: env.CHAIN_RPC_URL,
	};
}
