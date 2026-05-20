/**
 * Central client error reporting (console today; extend for PostHog/Sentry).
 */
export function reportClientError(
	error: Error,
	info?: { componentStack?: string | null; source?: string },
): void {
	const source = info?.source ? `[${info.source}] ` : "";
	console.error(`${source}Client error:`, error);
	if (info?.componentStack) {
		console.error(`${source}Component stack:`, info.componentStack);
	}
}
