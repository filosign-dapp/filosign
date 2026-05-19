/**
 * Browser security headers + CSP for the Filosign client (thirdweb wallets + API).
 */

const THIRDWEB_CONNECT =
	"https://embedded-wallet.thirdweb.com https://social.thirdweb.com https://api.thirdweb.com https://c.thirdweb.com wss://embedded-wallet.thirdweb.com";

const THIRDWEB_FRAMES =
	"https://embedded-wallet.thirdweb.com https://challenges.cloudflare.com";

/** PostHog script loader + survey assets (when analytics enabled). */
const POSTHOG_SCRIPTS =
	"https://us.i.posthog.com https://us-assets.i.posthog.com";

function normalizeSpaces(s: string): string {
	return s.replace(/\s+/g, " ").trim();
}

export function parseApiOrigin(platformUrl: string | undefined): string | null {
	if (!platformUrl) return null;
	try {
		return new URL(platformUrl).origin;
	} catch {
		return null;
	}
}

/**
 * `isDev`: Vite dev server (HMR needs relaxed script-src).
 * `apiOrigin`: origin of `VITE_SERVER_URL` (API), e.g. `http://127.0.0.1:3000`.
 */
export function buildContentSecurityPolicy(
	isDev: boolean,
	apiOrigin: string | null,
): string {
	const scriptSrc = isDev
		? `'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://challenges.cloudflare.com ${POSTHOG_SCRIPTS}`
		: `'self' 'wasm-unsafe-eval' https://challenges.cloudflare.com ${POSTHOG_SCRIPTS}`;

	const connectTail = isDev ? "http: https: ws: wss:" : "https: wss:";

	const apiPart = apiOrigin ? `${apiOrigin} ` : "";

	return normalizeSpaces(`
		default-src 'self';
		script-src ${scriptSrc};
		style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
		style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com;
		img-src 'self' data: blob: https:;
		font-src 'self' data: https://fonts.gstatic.com;
		object-src 'none';
		base-uri 'self';
		form-action 'self';
		frame-ancestors 'none';
		child-src https://embedded-wallet.thirdweb.com https://challenges.cloudflare.com;
		frame-src ${THIRDWEB_FRAMES};
		connect-src 'self' ${THIRDWEB_CONNECT} ${apiPart}${connectTail};
		worker-src 'self' blob:;
		manifest-src 'self'
	`);
}

export function securityHeadersRecord(
	isDev: boolean,
	apiOrigin: string | null,
): Record<string, string> {
	return {
		"Content-Security-Policy": buildContentSecurityPolicy(isDev, apiOrigin),
		"X-Content-Type-Options": "nosniff",
		"Referrer-Policy": "strict-origin-when-cross-origin",
		"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
	};
}
