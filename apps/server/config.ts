import type { ChainKey } from "@filosign/contracts";
import { base, baseSepolia, hardhat } from "viem/chains";
import env from "@/env";

const CHAIN_MAP = {
	local: hardhat,
	testnet: baseSepolia,
	mainnet: base,
} as const;

const INDEXER = {
	CONFIRMATIONS: 0n,
	MAX_BATCH_BLOCKS: 200n,
	POLL_INTERVAL_MS: 2_000,
	LOGS_PER_TX: 10,
	DEFAULT_START_BLOCK: 3_081_600n,
	JOB_LOCK_TTL_MS: 30_000,
	DEFAULT_MAX_JOB_ATTEMPTS: 5,
	MAX_NODE_LOOKBACK_PERIOD_MS: 16 * 60 * 60 * 1000,
};

const chainKey = env.CHAIN as ChainKey;
const runtimeChain = CHAIN_MAP[chainKey];
if (!runtimeChain) {
	throw new Error(`Invalid CHAIN: ${env.CHAIN}`);
}

console.log("runtime chain:", {
	id: runtimeChain.id,
	runtimeChain: runtimeChain.name,
});

const http = {
	cors: {
		origin: [env.CLIENT_URL, "http://localhost:3001", "http://localhost:3002"],
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
	INDEXER,
	http,
};

export default config;
