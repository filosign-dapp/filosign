import type { ChainKey } from "@filosign/evm";
import type { Chain } from "viem/chains";
import { base, baseSepolia, hardhat } from "viem/chains";

export const DEPLOYMENTS = [
	"local",
	"staging",
	"sandbox",
	"production",
] as const;

export type Deployment = (typeof DEPLOYMENTS)[number];

/** Chains permitted for each deployment (`production` may use mainnet or testnet). */
export const DEPLOYMENT_ALLOWED_CHAINS: Record<
	Deployment,
	readonly [ChainKey, ...ChainKey[]]
> = {
	local: ["local"],
	staging: ["testnet"],
	sandbox: ["testnet"],
	production: ["mainnet", "testnet"],
};

/** Default / conventional chain per deployment (not the only allowed value for `production`). */
export const DEPLOYMENT_CHAIN: Record<Deployment, ChainKey> = {
	local: "local",
	staging: "testnet",
	sandbox: "testnet",
	production: "mainnet",
};

export function allowedChainsForDeployment(
	deployment: Deployment,
): readonly ChainKey[] {
	return DEPLOYMENT_ALLOWED_CHAINS[deployment];
}

export function requiredChainForDeployment(deployment: Deployment): ChainKey {
	return DEPLOYMENT_CHAIN[deployment];
}

export function assertDeploymentChain(args: {
	deployment: Deployment;
	chain: ChainKey;
}): void {
	const allowed = allowedChainsForDeployment(args.deployment);
	if (!allowed.includes(args.chain)) {
		throw new Error(
			`DEPLOYMENT=${args.deployment} requires CHAIN in (${allowed.join("|")}), got CHAIN=${args.chain}`,
		);
	}
}

export function dodoLive(deployment: Deployment): boolean {
	return deployment === "production";
}

export function sandboxEntitlementsOpen(deployment: Deployment): boolean {
	return deployment === "sandbox";
}

export const SIGNUP_POLICIES = ["open", "invite_or_paid"] as const;

export type SignupPolicy = (typeof SIGNUP_POLICIES)[number];

/** Production requires invite or paid setup; other envs allow open signup for QA and demo. */
export function signupPolicy(deployment: Deployment): SignupPolicy {
	return deployment === "production" ? "invite_or_paid" : "open";
}

export function signupPolicyIsGated(deployment: Deployment): boolean {
	return signupPolicy(deployment) === "invite_or_paid";
}

export function deploymentBannerMessage(deployment: Deployment): string | null {
	switch (deployment) {
		case "staging":
			return "Staging - internal QA on Base Sepolia testnet.";
		case "sandbox":
			return "Sandbox - Base Sepolia testnet only. No real money. Data may be reset.";
		default:
			return null;
	}
}

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
	/** Primary RPC URL - only honored when `deployment` is `production` (mainnet or testnet). */
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
