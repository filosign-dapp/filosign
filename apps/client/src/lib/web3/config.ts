import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb/chains";
import type {
	UseConnectModalOptions,
	UseWalletDetailsModalOptions,
} from "thirdweb/react";
import { type InAppWalletCreationOptions, inAppWallet } from "thirdweb/wallets";
import type { Chain } from "viem";
import { defaultChain } from "@/src/constants";
import env from "@/src/env";

export const thirdwebClient = createThirdwebClient({
	clientId: env.VITE_THIRDWEB_CLIENT_ID,
});

function thirdwebChainFromViem(chain: Chain) {
	const rpc = chain.rpcUrls.default.http[0];
	if (!rpc) {
		throw new Error(`Chain ${chain.id} has no default RPC URL`);
	}
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

export const filosignInAppWalletOptions: NonNullable<InAppWalletCreationOptions> =
	{
		auth: {
			options: ["email", "google", "apple"],
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
		executionMode:
			env.VITE_CHAIN === "local"
				? { mode: "EOA" }
				: { mode: "EIP7702", sponsorGas: true },
		hidePrivateKeyExport: true,
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
