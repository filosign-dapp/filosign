import { type ChainKey, getDefinitionsEntry } from "@filosign/contracts";
import type { Chain } from "viem/chains";
import { base, baseSepolia, hardhat } from "viem/chains";
import env from "@/env";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import { emitCriticalPlatformEvent } from "@/lib/platform/analytics/platform-alerts";

const CHAIN_MAP = {
	local: hardhat,
	testnet: baseSepolia,
	mainnet: base,
} as const;

const chainKey = env.CHAIN as ChainKey;
const runtimeChain = CHAIN_MAP[chainKey];
if (!runtimeChain) {
	const error = `Invalid CHAIN: ${env.CHAIN}`;
	void emitCriticalPlatformEvent({
		name: PLATFORM_ALERT_EVENTS.serverBootstrapFailed,
		severity: "critical",
		message: "Server bootstrap validation failed",
		context: {
			stage: "chain_config",
			error,
		},
	});
	throw new Error(error);
}

const RUNTIME_CONTRACT_NAMES = [
	"FSFileRegistry",
	"FSPaymentValidator",
	"MockUSDC",
] as const;

function explorerAddressUrl(chain: Chain, address: string): string | undefined {
	const base = chain.blockExplorers?.default?.url;
	if (!base) return undefined;
	return `${base.replace(/\/$/, "")}/address/${address}`;
}

const definitions = getDefinitionsEntry(chainKey);
const contracts = Object.fromEntries(
	RUNTIME_CONTRACT_NAMES.flatMap((name) => {
		const def = definitions[name as keyof typeof definitions];
		if (
			!def ||
			typeof def !== "object" ||
			!("address" in def) ||
			typeof def.address !== "string"
		) {
			return [];
		}
		return [
			[
				name,
				{
					address: def.address,
					explorer: explorerAddressUrl(runtimeChain, def.address),
				},
			],
		];
	}),
);

console.log("runtime deployment:", {
	deployment: env.DEPLOYMENT,
	id: runtimeChain.id,
	chainKey,
	runtimeChain: runtimeChain.name,
	rpc: runtimeChain.rpcUrls.default.http[0],
	contracts,
});

const http = {
	cors: {
		origin: [
			env.CLIENT_URL,
			env.ASTRO_URL,
			"http://localhost:3001",
			"http://localhost:3002",
		],
		allowHeaders: [
			"Content-Type",
			"Authorization",
			"X-Wallet-Address",
			"X-Org-Id",
			"x-session-token",
		],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		credentials: true,
	},
	contentSecurityPolicy:
		"default-src 'self'; " +
		"script-src 'self' 'unsafe-eval' 'unsafe-inline' https://waap.xyz https://*.waap.xyz; " +
		"style-src 'self' 'unsafe-inline'; " +
		"connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 https://waap.xyz https://*.waap.xyz https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://sepolia.base.org https://mainnet.base.org https://rpc.ankr.com https://*.alchemy.com https://*.quiknode.pro https://api.zerocomputing.com https://*.holonym.io https://*.silkwallet.net https://*.silk-protector.com https://*.fly.dev; " +
		"img-src 'self' data: blob: https:; " +
		"font-src 'self' data:; " +
		"frame-src 'self' https://waap.xyz https://*.waap.xyz https://verify.walletconnect.com;",
	port: env.PORT ?? 3000,
};

const config = {
	chainKey,
	runtimeChain,
	http,
};

export default config;
