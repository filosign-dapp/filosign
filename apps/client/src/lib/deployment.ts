import {
	type Deployment,
	deploymentBannerMessage,
	type SignupPolicy,
	signupPolicy,
	signupPolicyIsGated,
} from "@filosign/shared";
import env from "@/src/env";

export function clientDeployment(): Deployment {
	return env.VITE_DEPLOYMENT;
}

export function clientSignupPolicy(): SignupPolicy {
	return signupPolicy(env.VITE_DEPLOYMENT);
}

export function clientSignupPolicyIsGated(): boolean {
	return signupPolicyIsGated(env.VITE_DEPLOYMENT);
}

/** Sign-in page Google shortcut: every deployment except production. */
export function clientDevGoogleSignInEnabled(): boolean {
	return env.VITE_DEPLOYMENT !== "production";
}

/** Cookie consent banner + opt-in analytics: production only. */
export function clientAnalyticsConsentRequired(): boolean {
	return env.VITE_DEPLOYMENT === "production";
}

export function deploymentBannerText(): string | null {
	return deploymentBannerMessage(env.VITE_DEPLOYMENT);
}
