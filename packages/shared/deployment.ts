import type { ChainKey } from "@filosign/contracts";

export const DEPLOYMENTS = [
	"local",
	"staging",
	"sandbox",
	"production",
] as const;

export type Deployment = (typeof DEPLOYMENTS)[number];

export const DEPLOYMENT_CHAIN: Record<Deployment, ChainKey> = {
	local: "local",
	staging: "testnet",
	sandbox: "testnet",
	production: "mainnet",
};

export function requiredChainForDeployment(deployment: Deployment): ChainKey {
	return DEPLOYMENT_CHAIN[deployment];
}

export function assertDeploymentChain(args: {
	deployment: Deployment;
	chain: ChainKey;
}): void {
	const required = requiredChainForDeployment(args.deployment);
	if (args.chain !== required) {
		throw new Error(
			`DEPLOYMENT=${args.deployment} requires CHAIN=${required}, got CHAIN=${args.chain}`,
		);
	}
}

export function billingEnabled(deployment: Deployment): boolean {
	return deployment === "staging" || deployment === "production";
}

export function dodoLive(deployment: Deployment): boolean {
	return deployment === "production";
}

export function sandboxEntitlementsOpen(deployment: Deployment): boolean {
	return deployment === "sandbox";
}

/** Non-production developer bypass — server resolves by wallet email. */
export const DEV_ENTITLEMENTS_BYPASS_EMAIL = "kartik100100@gmail.com";

export function devEntitlementsBypass(
	deployment: Deployment,
	email: string | null | undefined,
): boolean {
	if (deployment === "production") return false;
	const normalized = email?.trim().toLowerCase();
	return normalized === DEV_ENTITLEMENTS_BYPASS_EMAIL;
}

export function deploymentBannerMessage(deployment: Deployment): string | null {
	switch (deployment) {
		case "staging":
			return "Staging — internal QA on Base Sepolia testnet.";
		case "sandbox":
			return "Sandbox — Base Sepolia testnet only. No real money. Data may be reset.";
		default:
			return null;
	}
}
