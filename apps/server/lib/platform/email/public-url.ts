import env from "@/env";

/** React app origin (no trailing slash). Used for links in email and elsewhere. */
export function getClientUrl(): string {
	return env.CLIENT_URL.replace(/\/$/, "");
}
