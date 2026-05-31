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

export function dodoLive(deployment: Deployment): boolean {
	return deployment === "production";
}

export function sandboxEntitlementsOpen(deployment: Deployment): boolean {
	return deployment === "sandbox";
}

export const SIGNUP_POLICIES = ["open", "invite_or_paid"] as const;

export type SignupPolicy = (typeof SIGNUP_POLICIES)[number];

/** Production requires invite or paid setup; other envs allow open signup for QA and demo. */
export function signupPolicy(deployment: Deployment): SignupPolicy {
	return deployment === "production" ? "invite_or_paid" : "open";
}

export function signupPolicyIsGated(deployment: Deployment): boolean {
	return signupPolicy(deployment) === "invite_or_paid";
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
