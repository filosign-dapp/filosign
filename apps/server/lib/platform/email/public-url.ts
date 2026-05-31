import env from "@/env";

/** React app origin (no trailing slash). Used for links in email and elsewhere. */
export function getClientUrl(): string {
	return env.CLIENT_URL.replace(/\/$/, "");
}

/** API server origin (no trailing slash). Used for checkout magic links. */
export function getServerUrl(): string {
	return env.SERVER_URL.replace(/\/$/, "");
}

/** Marketing site origin (no trailing slash). */
export function getAstroUrl(): string {
	return env.ASTRO_URL.replace(/\/$/, "");
}
