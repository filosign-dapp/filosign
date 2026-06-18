import { env } from "../env";
import {
	astroPricingHref,
	astroPublicCheckoutEnabled,
	astroRequestAccessHref,
} from "./public-access";

const publicCheckoutEnabled = astroPublicCheckoutEnabled();

export const MARKETING_CTA = {
	navLaunchHref: env.PUBLIC_CLIENT_URL,
	navLaunchLabel: "Launch App",
	getStartedHref: publicCheckoutEnabled
		? astroPricingHref()
		: astroRequestAccessHref(),
	getStartedLabel: "Request invite",
	exploreHref: "/#how-it-works",
	exploreLabel: "See how it works",
	pricingHref: astroPricingHref(),
	publicCheckoutEnabled,
} as const;
