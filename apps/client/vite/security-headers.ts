/**
 * Browser security headers + CSP for the Filosign client (thirdweb wallets + API).
 */

const THIRDWEB_CONNECT =
	"https://embedded-wallet.thirdweb.com https://social.thirdweb.com https://api.thirdweb.com https://c.thirdweb.com wss://embedded-wallet.thirdweb.com";

const THIRDWEB_FRAMES =
	"https://embedded-wallet.thirdweb.com https://challenges.cloudflare.com";

/** PostHog script loader + survey assets (when analytics enabled). */
const POSTHOG_SCRIPTS_DEFAULT =
	"https://us.i.posthog.com https://us-assets.i.posthog.com https://eu.i.posthog.com https://eu-assets.i.posthog.com";

const CLOUDFLARE_ANALYTICS = "https://static.cloudflareinsights.com";

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

export function parsePosthogOrigin(
	posthogHost: string | undefined,
): string | null {
	if (!posthogHost) return null;
	try {
		return new URL(posthogHost).origin;
	} catch {
		return null;
	}
}

function posthogScriptOrigins(posthogOrigin: string | null): string {
	const origins = new Set<string>(POSTHOG_SCRIPTS_DEFAULT.split(" "));
	if (posthogOrigin) {
		origins.add(posthogOrigin);
	}
	return [...origins].join(" ");
}

export type ContentSecurityPolicyOptions = {
	isDev: boolean;
	apiOrigin: string | null;
	posthogOrigin?: string | null;
	/** Meta CSP ignores frame-ancestors; omit for injected `<meta>` tags. */
	includeFrameAncestors?: boolean;
};

/**
 * `isDev`: Vite dev server (HMR needs relaxed script-src).
 * `apiOrigin`: origin of `VITE_SERVER_URL` (API), e.g. `http://127.0.0.1:3000`.
 */
export function buildContentSecurityPolicy(
	isDev: boolean,
	apiOrigin: string | null,
	options?: Omit<ContentSecurityPolicyOptions, "isDev" | "apiOrigin">,
): string {
	return buildContentSecurityPolicyFromOptions({
		isDev,
		apiOrigin,
		...options,
	});
}

export function buildContentSecurityPolicyFromOptions(
	options: ContentSecurityPolicyOptions,
): string {
	const {
		isDev,
		apiOrigin,
		posthogOrigin = null,
		includeFrameAncestors = true,
	} = options;
	const posthogScripts = posthogScriptOrigins(posthogOrigin);

	const scriptSrc = isDev
		? `'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://challenges.cloudflare.com ${posthogScripts} ${CLOUDFLARE_ANALYTICS}`
		: `'self' 'wasm-unsafe-eval' https://challenges.cloudflare.com ${posthogScripts} ${CLOUDFLARE_ANALYTICS}`;

	const connectTail = isDev ? "http: https: ws: wss:" : "https: wss:";
	const posthogConnect = posthogOrigin ? `${posthogOrigin} ` : "";

	const apiPart = apiOrigin ? `${apiOrigin} ` : "";
	const frameAncestors = includeFrameAncestors ? "frame-ancestors 'none';" : "";

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
		${frameAncestors}
		child-src https://embedded-wallet.thirdweb.com https://challenges.cloudflare.com;
		frame-src ${THIRDWEB_FRAMES};
		connect-src 'self' ${THIRDWEB_CONNECT} ${apiPart}${posthogConnect}${connectTail};
		worker-src 'self' blob:;
		manifest-src 'self'
	`);
}

export function securityHeadersRecord(
	isDev: boolean,
	apiOrigin: string | null,
	posthogOrigin?: string | null,
): Record<string, string> {
	return {
		"Content-Security-Policy": buildContentSecurityPolicy(isDev, apiOrigin, {
			posthogOrigin,
			includeFrameAncestors: true,
		}),
		"X-Content-Type-Options": "nosniff",
		"Referrer-Policy": "strict-origin-when-cross-origin",
		"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
	};
}
