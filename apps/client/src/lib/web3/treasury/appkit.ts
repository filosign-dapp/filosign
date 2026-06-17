import type { AppKit } from "@reown/appkit";
import { createAppKit } from "@reown/appkit";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { base, baseSepolia, hardhat } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { Config } from "@wagmi/core";
import env from "@/src/env";

function treasuryProjectId(): string {
	const projectId =
		env.VITE_REOWN_PROJECT_ID ?? env.VITE_WALLETCONNECT_PROJECT_ID;
	if (!projectId) {
		throw new Error("Reown project id is not configured.");
	}
	return projectId;
}

function treasuryNetwork(): AppKitNetwork {
	if (env.VITE_CHAIN === "local") return hardhat;
	if (env.VITE_CHAIN === "testnet") return baseSepolia;
	return base;
}

const treasuryMetadata = {
	name: "Filosign",
	description: "Filosign treasury wallet linking",
	url: env.VITE_CLIENT_URL,
	icons: [`${env.VITE_CLIENT_URL.replace(/\/$/, "")}/logo.webp`],
};

type TreasuryAppKit = {
	modal: AppKit;
	wagmiConfig: Config;
};

let treasuryAppKit: TreasuryAppKit | null = null;

export function getTreasuryAppKit(): TreasuryAppKit {
	if (treasuryAppKit) return treasuryAppKit;

	const network = treasuryNetwork();
	const networks = [network] as [AppKitNetwork, ...AppKitNetwork[]];
	const projectId = treasuryProjectId();

	const wagmiAdapter = new WagmiAdapter({
		projectId,
		networks,
	});

	const modal = createAppKit({
		adapters: [wagmiAdapter],
		networks,
		defaultNetwork: network,
		projectId,
		metadata: treasuryMetadata,
		features: {
			analytics: false,
			email: false,
			socials: [],
		},
		themeVariables: {
			"--apkt-font-family":
				'"Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif',
		},
	});

	treasuryAppKit = {
		modal,
		wagmiConfig: wagmiAdapter.wagmiConfig,
	};
	return treasuryAppKit;
}
