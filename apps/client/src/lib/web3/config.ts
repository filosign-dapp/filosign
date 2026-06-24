import type { ChainKey } from "@filosign/evm";
import {
	resolveChainRpcHttpUrl,
	warnIfChainRpcUrlIgnored,
} from "@filosign/shared";
import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb/chains";
import type {
	UseConnectModalOptions,
	UseWalletDetailsModalOptions,
} from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";
import type { Chain } from "viem";
import { defaultChain } from "@/src/constants";
import env from "@/src/env";

function viteChainKey(): ChainKey {
	if (env.VITE_CHAIN === "local") return "local";
	if (env.VITE_CHAIN === "testnet") return "testnet";
	return "mainnet";
}

warnIfChainRpcUrlIgnored({
	deployment: env.VITE_DEPLOYMENT,
	chainRpcUrl: env.VITE_CHAIN_RPC_URL,
	envVarName: "VITE_CHAIN_RPC_URL",
	log: (message) => console.warn(message),
});

export const thirdwebClient = createThirdwebClient({
	clientId: env.VITE_THIRDWEB_CLIENT_ID,
});

function thirdwebChainFromViem(chain: Chain) {
	const rpc = resolveChainRpcHttpUrl({
		deployment: env.VITE_DEPLOYMENT,
		chainKey: viteChainKey(),
		primaryUrl: env.VITE_CHAIN_RPC_URL,
	});
	const explorer = chain.blockExplorers?.default;
	return defineChain({
		id: chain.id,
		name: chain.name,
		nativeCurrency: chain.nativeCurrency,
		rpc,
		blockExplorers: explorer
			? [{ name: explorer.name, url: explorer.url, apiUrl: explorer.apiUrl }]
			: undefined,
	});
}

export const defaultThirdwebChain = thirdwebChainFromViem(defaultChain);

const appOrigin = env.VITE_CLIENT_URL.replace(/\/$/, "");

function filosignInAppAuthOptions(): string[] {
	if (env.VITE_DEPLOYMENT === "production") return ["email"];
	return ["email", "google"];
}

export const filosignInAppWalletOptions: Record<string, unknown> = {
	auth: {
		options: filosignInAppAuthOptions(),
	},
	metadata: {
		name: "Filosign",
		icon: `${appOrigin}/logo_icon.webp`,
		image: {
			src: `${appOrigin}/logo.webp`,
			alt: "Filosign",
			width: 64,
			height: 64,
		},
	},
	executionMode: { mode: "EOA" },
	hidePrivateKeyExport: false,
};

export const filosignInAppWallet = inAppWallet(filosignInAppWalletOptions);

export const filosignAppMetadata = {
	name: "Filosign",
	url: appOrigin,
	description: "Secure document signing and envelopes",
	logoUrl: `${appOrigin}/logo.webp`,
};

export const filosignMockLegalUrls = {
	termsOfServiceUrl: `${env.VITE_ASTRO_URL.replace(/\/$/, "")}/terms`,
	privacyPolicyUrl: `${env.VITE_ASTRO_URL.replace(/\/$/, "")}/privacy`,
};

const thirdwebModalTheme = "light" as const;

const embeddedOnlyConnect = {
	wallets: [filosignInAppWallet],
	showAllWallets: false,
};

export const thirdwebConnectModalOptions: UseConnectModalOptions = {
	client: thirdwebClient,
	theme: thirdwebModalTheme,
	...embeddedOnlyConnect,
	title: "Sign in",
	size: "compact",
	showThirdwebBranding: false,
	appMetadata: filosignAppMetadata,
	termsOfServiceUrl: filosignMockLegalUrls.termsOfServiceUrl,
	privacyPolicyUrl: filosignMockLegalUrls.privacyPolicyUrl,
	chain: defaultThirdwebChain,
};

export const thirdwebWalletModalOptions: UseWalletDetailsModalOptions = {
	client: thirdwebClient,
	chains: [defaultThirdwebChain],
	theme: thirdwebModalTheme,
	hideSwitchWallet: true,
	connectOptions: {
		...embeddedOnlyConnect,
		appMetadata: filosignAppMetadata,
		connectModal: {
			title: "Sign in",
			size: "compact",
			showThirdwebBranding: false,
		},
	},
};
