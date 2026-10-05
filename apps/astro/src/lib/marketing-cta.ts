import { env } from "../env";
import {
	astroPricingHref,
	astroPublicCheckoutEnabled,
	astroRequestAccessHref,
} from "./public-access";

const publicCheckoutEnabled = astroPublicCheckoutEnabled();
const bookCallHref = env.PUBLIC_BOOK_CALL_URL;
const accessHref = publicCheckoutEnabled
	? astroPricingHref()
	: astroRequestAccessHref();

export const MARKETING_CTA = {
	navLaunchHref: env.PUBLIC_CLIENT_URL,
	navLaunchLabel: "Launch App",
	getStartedHref: bookCallHref ?? accessHref,
	getStartedLabel: bookCallHref ? "Book a call" : "Request invite",
	getStartedNote: bookCallHref
		? "15 minutes with the founder. We'll set up your first workflow with you."
		: undefined,
	exploreHref: "/#how-it-works",
	exploreLabel: "See how it works",
	accessHref,
	pricingHref: astroPricingHref(),
	publicCheckoutEnabled,
} as const;
