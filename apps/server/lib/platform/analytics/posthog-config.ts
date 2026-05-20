/** PostHog settings read from process.env so unit tests avoid loading full `@/env`. */
export function readPostHogConfig() {
	const enabled = process.env.POSTHOG_ENABLED === "true";
	const apiKey = process.env.POSTHOG_API_KEY;
	const host = process.env.POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
	return { enabled, apiKey, host };
}

export function readAnalyticsChain(): string {
	return process.env.CHAIN?.trim() || "local";
}
