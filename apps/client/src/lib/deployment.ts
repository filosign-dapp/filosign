import {
	type Deployment,
	deploymentBannerMessage,
	effectiveSignupPolicyIsGated,
	resolveEffectiveSignupPolicy,
	resolvePublicCheckoutEnabled,
	type SignupPolicy,
} from "@filosign/shared";
import env from "@/src/env";

export function clientDeployment(): Deployment {
	return env.VITE_DEPLOYMENT;
}

export function clientPublicCheckoutEnabled(): boolean {
	return resolvePublicCheckoutEnabled({
		deployment: env.VITE_DEPLOYMENT,
		explicit: env.VITE_PUBLIC_CHECKOUT_ENABLED,
	});
}

export function clientSignupPolicy(): SignupPolicy {
	return resolveEffectiveSignupPolicy({
		deployment: env.VITE_DEPLOYMENT,
		publicSignupEnabled: env.VITE_PUBLIC_SIGNUP_ENABLED,
	});
}

export function clientSignupPolicyIsGated(): boolean {
	return effectiveSignupPolicyIsGated({
		deployment: env.VITE_DEPLOYMENT,
		publicSignupEnabled: env.VITE_PUBLIC_SIGNUP_ENABLED,
	});
}

/** Cookie consent banner + opt-in analytics: production only. */
export function clientAnalyticsConsentRequired(): boolean {
	return env.VITE_DEPLOYMENT === "production";
}

export function deploymentBannerText(): string | null {
	return deploymentBannerMessage(env.VITE_DEPLOYMENT);
}
