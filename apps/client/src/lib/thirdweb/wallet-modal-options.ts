import type {
	UseConnectModalOptions,
	UseWalletDetailsModalOptions,
} from "thirdweb/react";
import { defaultThirdwebChain } from "@/src/lib/thirdweb/chains";
import { thirdwebClient } from "@/src/lib/thirdweb/client";
import {
	filosignAppMetadata,
	filosignInAppWallet,
	filosignMockLegalUrls,
} from "@/src/lib/thirdweb/in-app-wallet";

/** Filosign UI is light-first; thirdweb modals default to dark without this. */
export const thirdwebModalTheme = "light" as const;

const embeddedOnlyConnect = {
	wallets: [filosignInAppWallet],
	showAllWallets: false,
};

/** Shared options for thirdweb Connect modal (sign-in). */
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

/** Shared options for thirdweb wallet details / top-up modals. */
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
