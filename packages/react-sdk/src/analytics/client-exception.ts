type ClientExceptionCapture = (
	error: unknown,
	properties?: Record<string, unknown>,
) => void;

let capture: ClientExceptionCapture | null = null;

/** Registered by `PostHogAnalyticsBridge` when analytics is enabled. */
export function registerClientExceptionCapture(
	fn: ClientExceptionCapture | null,
): void {
	capture = fn;
}

/** Non-React entry (e.g. `reportClientError`) — no-ops when analytics disabled. */
export function captureClientException(
	error: unknown,
	properties?: Record<string, unknown>,
): void {
	capture?.(error, properties);
}
