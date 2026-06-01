import { captureClientException } from "@filosign/react/analytics";

/**
 * Central client error reporting (console + PostHog when analytics consent allows).
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
	captureClientException(error, {
		...(info?.source ? { source: info.source } : {}),
		...(info?.componentStack
			? { component_stack: info.componentStack.slice(0, 500) }
			: {}),
	});
}
