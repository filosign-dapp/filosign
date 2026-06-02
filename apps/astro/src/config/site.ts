import { env } from "../env";

export const siteName = "Filosign";

export const siteTagline = "Agreements that unlock the next step";

export const defaultTitle = `${siteName} - ${siteTagline}`;

export const defaultDescription =
	"Send private documents, collect signatures, and release payouts or files only when the right conditions are met.";

export const twitterSite = "@filosign";

export const themeColor = "#202223";

export const social = {
	x: "https://x.com/filosign",
} as const;

export const siteUrl = env.PUBLIC_ASTRO_URL.replace(/\/$/, "");

export const parentOrganization = {
	name: "Filosign",
	url: siteUrl,
} as const;

export const logo = {
	webp: "/logo.webp",
	/** Used in JSON-LD ImageObject */
	width: 512,
	height: 512,
} as const;

/** Inner pages: `About - Filosign` */
export function titleWithBrand(pageTitle: string): string {
	return `${pageTitle} - ${siteName}`;
}

/** Blog posts: `{title} - Filosign Blog` */
export function blogTitleWithBrand(postTitle: string): string {
	return `${postTitle} - ${siteName} Blog`;
}
