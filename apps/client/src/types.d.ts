declare module "*.svg" {
	const content: string;
	export default content;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_CHAIN: "local" | "testnet" | "mainnet";
	readonly VITE_THIRDWEB_CLIENT_ID: string;
	readonly VITE_SERVER_URL: string;
	readonly VITE_ASTRO_URL: string;
	readonly VITE_POSTHOG_KEY?: string;
	readonly VITE_POSTHOG_HOST?: string;
	readonly VITE_POSTHOG_ENABLED?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
