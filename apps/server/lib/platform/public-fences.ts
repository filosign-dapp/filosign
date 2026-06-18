import { throwAppError } from "@filosign/errors/server";
import {
	effectiveSignupPolicyIsGated,
	resolveEffectiveSignupPolicy,
	resolvePublicCheckoutEnabled,
	type SignupPolicy,
} from "@filosign/shared";
import env from "@/env";

export function serverPublicCheckoutEnabled(): boolean {
	return resolvePublicCheckoutEnabled({
		deployment: env.DEPLOYMENT,
		explicit: env.PUBLIC_CHECKOUT_ENABLED,
	});
}

export function serverEffectiveSignupPolicy(): SignupPolicy {
	return resolveEffectiveSignupPolicy({
		deployment: env.DEPLOYMENT,
		publicSignupEnabled: env.PUBLIC_SIGNUP_ENABLED,
	});
}

export function serverSignupPolicyIsGated(): boolean {
	return effectiveSignupPolicyIsGated({
		deployment: env.DEPLOYMENT,
		publicSignupEnabled: env.PUBLIC_SIGNUP_ENABLED,
	});
}

export function assertPublicCheckoutEnabled(): void {
	if (!serverPublicCheckoutEnabled()) {
		throwAppError("BILLING.PUBLIC_CHECKOUT_DISABLED");
	}
}
