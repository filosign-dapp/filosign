import { env } from "../env";

export const siteName = "Filosign";

export const siteTagline = "Trustless standard for permanent agreements";

export const defaultTitle = `${siteName} — ${siteTagline}`;

export const defaultDescription =
	"Send, sign, and verify sensitive documents with encrypted workflows. Private document signing on the blockchain with self-sovereign identity and E2EE.";

export const twitterSite = "@filosign";

export const themeColor = "#202223";

export const social = {
	x: "https://x.com/filosign",
	github: "https://github.com/hetairoi-labs/filosign",
} as const;

export const parentOrganization = {
	name: "Hetairoi Labs",
	url: "https://hetairoi.xyz",
} as const;

export const logo = {
	webp: "/logo.webp",
	faviconSvg: "/favicon.svg",
	faviconIco: "/favicon.ico",
	appleTouch: "/logo.webp",
	/** Used in JSON-LD ImageObject */
	width: 512,
	height: 512,
} as const;

export const siteUrl = env.PUBLIC_ASTRO_URL.replace(/\/$/, "");

/** Inner pages: `About — Filosign` */
export function titleWithBrand(pageTitle: string): string {
	return `${pageTitle} — ${siteName}`;
}

/** Blog posts: `{title} — Filosign Blog` */
export function blogTitleWithBrand(postTitle: string): string {
	return `${postTitle} — ${siteName} Blog`;
}
