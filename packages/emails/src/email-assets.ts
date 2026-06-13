import type { PaidCheckoutPlanId } from "@filosign/shared";
import { pricingCheckoutDialogImagePath } from "@filosign/shared";

/** Marketing site origin for email image URLs (`ASTRO_URL`). */
export function getEmailAssetBaseUrl(): string {
	const raw = process.env.ASTRO_URL;
	if (!raw) {
		throw new Error("ASTRO_URL is not set");
	}
	return raw.replace(/\/$/, "");
}

/** Absolute URL for a site-root public asset (e.g. `/logo.webp`). */
export function emailAssetUrl(path: string): string {
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return `${getEmailAssetBaseUrl()}${normalized}`;
}

/** Absolute URL for assets under `apps/astro/public/emails/`. */
export function themeAssetUrl(relativePath: string): string {
	const normalized = relativePath.replace(/^\//, "");
	return emailAssetUrl(`/emails/${normalized}`);
}

/** Checkout dialog hero for paid setup email (matches astro pricing dialog). */
export function paidSetupHeroForPlan(planId: PaidCheckoutPlanId): string {
	return emailAssetUrl(pricingCheckoutDialogImagePath(planId));
}

export const filosignEmailAssets = {
	get logo() {
		return emailAssetUrl("/logo.webp");
	},
	icons: {
		get email() {
			return emailAssetUrl("/icons/mail.svg");
		},
		get x() {
			return emailAssetUrl("/icons/x.svg");
		},
		get website() {
			return emailAssetUrl("/icons/globe.svg");
		},
	},
	barebone: {
		get hero() {
			return themeAssetUrl("barebones/barebones-image.png");
		},
		get partnerInviteHero() {
			return emailAssetUrl("/images/ww/stock_59.webp");
		},
	},
};
