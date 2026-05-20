import type { AuthCookieConfig } from "./config";

export function createAuthCookies(config: AuthCookieConfig) {
	const {
		refreshCookieName,
		refreshCookiePath,
		refreshExpirationSeconds,
		secureCookies,
	} = config;

	function buildRefreshSetCookie(rawToken: string): string {
		const parts = [
			`${refreshCookieName}=${encodeURIComponent(rawToken)}`,
			`Path=${refreshCookiePath}`,
			"HttpOnly",
			"SameSite=Lax",
			`Max-Age=${refreshExpirationSeconds}`,
		];
		if (secureCookies) parts.push("Secure");
		return parts.join("; ");
	}

	function buildRefreshClearCookie(): string {
		const parts = [
			`${refreshCookieName}=`,
			`Path=${refreshCookiePath}`,
			"HttpOnly",
			"SameSite=Lax",
			"Max-Age=0",
		];
		if (secureCookies) parts.push("Secure");
		return parts.join("; ");
	}

	function readRefreshCookie(cookieHeader: string | undefined): string | null {
		if (!cookieHeader) return null;
		for (const part of cookieHeader.split(";")) {
			const [name, ...rest] = part.trim().split("=");
			if (name === refreshCookieName) {
				const value = rest.join("=");
				if (!value) return null;
				try {
					return decodeURIComponent(value);
				} catch {
					return value;
				}
			}
		}
		return null;
	}

	return { buildRefreshSetCookie, buildRefreshClearCookie, readRefreshCookie };
}

export type AuthCookies = ReturnType<typeof createAuthCookies>;
