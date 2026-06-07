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

export const filosignEmailAssets = {
	get logo() {
		return emailAssetUrl("/logo.webp");
	},
	icons: {
		get email() {
			return emailAssetUrl("/icons/mail.svg");
		},
		get website() {
			return emailAssetUrl("/icons/globe.svg");
		},
	},
	collage: {
		get hero1() {
			return themeAssetUrl("collage/collage-image-1.png");
		},
	},
	dither: {
		get hero1() {
			return themeAssetUrl("dither/dither-image-1.png");
		},
	},
	skin: {
		get hero1() {
			return themeAssetUrl("skin/skin-image-1.png");
		},
	},
	tech: {
		get hero1() {
			return themeAssetUrl("tech/tech-image.png");
		},
	},
	shared: {
		socialX(dark: boolean) {
			return themeAssetUrl(
				dark ? "shared/social-x-black.png" : "shared/social-x-white.png",
			);
		},
	},
};
