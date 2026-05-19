import { type InAppWalletCreationOptions, inAppWallet } from "thirdweb/wallets";
import env from "@/src/env";

const appOrigin = env.VITE_CLIENT_URL.replace(/\/$/, "");

/** Shared in-app wallet config (wagmi connector + Connect modal). */
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
		executionMode: { mode: "EOA" },
		hidePrivateKeyExport: true,
	};

export const filosignInAppWallet = inAppWallet(filosignInAppWalletOptions);

export const filosignAppMetadata = {
	name: "Filosign",
	url: appOrigin,
	description: "Secure document signing and envelopes",
	logoUrl: `${appOrigin}/logo.webp`,
};

/** Placeholder legal URLs until marketing pages ship. */
export const filosignMockLegalUrls = {
	termsOfServiceUrl: `${env.VITE_ASTRO_URL.replace(/\/$/, "")}/terms`,
	privacyPolicyUrl: `${env.VITE_ASTRO_URL.replace(/\/$/, "")}/privacy`,
};
