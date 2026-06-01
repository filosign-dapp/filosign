import type { ChainKey } from "@filosign/contracts";
import type { Chain } from "viem/chains";
import { base, baseSepolia, hardhat } from "viem/chains";
import type { Deployment } from "./deployment";

const VIEM_CHAIN_BY_KEY = {
	local: hardhat,
	testnet: baseSepolia,
	mainnet: base,
} as const satisfies Record<ChainKey, Chain>;

export function viemChainForKey(chainKey: ChainKey): Chain {
	return VIEM_CHAIN_BY_KEY[chainKey];
}

export function publicRpcUrlForChain(chain: Chain): string {
	const url = chain.rpcUrls.default.http[0];
	if (!url) {
		throw new Error(`Chain ${chain.id} has no default RPC URL`);
	}
	return url;
}

export type BuildChainRpcTransportArgs = {
	deployment: Deployment;
	chainKey: ChainKey;
	/** Primary RPC URL — only honored when `deployment` is `production` (mainnet or testnet). */
	primaryUrl?: string | undefined;
};

/** Production dedicated RPC from env; ignored on local/staging/sandbox. */
export function effectiveChainRpcPrimaryUrl(
	args: BuildChainRpcTransportArgs,
): string | undefined {
	if (args.deployment !== "production") return undefined;
	const trimmed = args.primaryUrl?.trim();
	return trimmed || undefined;
}

/** Primary HTTP URL for thirdweb `defineChain` / logging (fallback URLs are transport-only). */
export function resolveChainRpcHttpUrl(
	args: BuildChainRpcTransportArgs,
): string {
	const primary = effectiveChainRpcPrimaryUrl(args);
	if (primary) return primary;
	return publicRpcUrlForChain(viemChainForKey(args.chainKey));
}

export type ChainRpcConfigSummary = {
	chainKey: ChainKey;
	deployment: Deployment;
	/** URL used as first hop (primary or public only). */
	httpUrl: string;
	publicFallbackUrl: string;
	dedicatedPrimary: boolean;
	fallbackEnabled: boolean;
};

export function summarizeChainRpcConfig(
	args: BuildChainRpcTransportArgs,
): ChainRpcConfigSummary {
	const chain = viemChainForKey(args.chainKey);
	const publicFallbackUrl = publicRpcUrlForChain(chain);
	const primary = effectiveChainRpcPrimaryUrl(args);
	return {
		chainKey: args.chainKey,
		deployment: args.deployment,
		httpUrl: primary ?? publicFallbackUrl,
		publicFallbackUrl,
		dedicatedPrimary: Boolean(primary),
		fallbackEnabled: Boolean(primary),
	};
}

export function warnIfChainRpcUrlIgnored(args: {
	deployment: Deployment;
	chainRpcUrl?: string | undefined;
	envVarName?: string;
	log: (message: string) => void;
}): void {
	const trimmed = args.chainRpcUrl?.trim();
	if (!trimmed) return;
	if (args.deployment === "production") return;
	const name = args.envVarName ?? "CHAIN_RPC_URL";
	args.log(
		`${name} is set but ignored because DEPLOYMENT=${args.deployment}; dedicated RPC applies only to production.`,
	);
}

const RPC_ERROR_HINTS = [
	"rate limit",
	"429",
	"timeout",
	"timed out",
	"econnreset",
	"enotfound",
	"502",
	"503",
	"504",
	"bad gateway",
	"service unavailable",
	"gateway timeout",
] as const;

function rpcErrorText(error: object): string {
	const e = error as {
		shortMessage?: string;
		message?: string;
		details?: string;
		metaMessages?: string[];
		cause?: unknown;
	};
	const parts = [e.shortMessage, e.message, e.details].filter(
		(v): v is string => typeof v === "string",
	);
	if (Array.isArray(e.metaMessages)) {
		parts.push(...e.metaMessages);
	}
	if (e.cause && typeof e.cause === "object") {
		parts.push(rpcErrorText(e.cause));
	}
	return parts.join(" ").toLowerCase();
}

/** Heuristic for JSON-RPC transport failures worth ops attention. */
export function isLikelyRpcTransportError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const e = error as { status?: number };
	if (typeof e.status === "number" && e.status >= 429) return true;
	const text = rpcErrorText(error);
	return RPC_ERROR_HINTS.some((hint) => text.includes(hint));
}
