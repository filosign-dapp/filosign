import { resolvePublicCheckoutEnabled } from "@filosign/shared";
import { env } from "../env";

function astroDeployment() {
	if (env.PUBLIC_DEPLOYMENT) return env.PUBLIC_DEPLOYMENT;
	return env.PUBLIC_ASTRO_URL.includes("localhost") ? "local" : "production";
}

export function astroPublicCheckoutEnabled(): boolean {
	return resolvePublicCheckoutEnabled({
		deployment: astroDeployment(),
		explicit: env.PUBLIC_CHECKOUT_ENABLED,
	});
}

export function astroPricingHref(): string {
	return "/pricing";
}

export function astroRequestAccessHref(): string {
	return "/pricing#pricing";
}
