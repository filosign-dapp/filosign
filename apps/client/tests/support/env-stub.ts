import { mock } from "bun:test";

export const clientTestEnvStub = {
	VITE_DEPLOYMENT: "local",
	VITE_CHAIN: "local",
	VITE_THIRDWEB_CLIENT_ID: "test",
	VITE_SERVER_URL: "http://localhost:3000",
	VITE_ASTRO_URL: "http://localhost:4321",
	VITE_CLIENT_URL: "http://localhost:5173",
	VITE_POSTHOG_HOST: "https://app.posthog.com",
} as const;

mock.module("@/src/env", () => ({
	default: clientTestEnvStub,
}));
