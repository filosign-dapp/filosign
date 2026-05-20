/**
 * Dev-only timestamps for dashboard refresh / hydration debugging.
 * Filter console: `[hydration`
 */
const ENABLED = import.meta.env.DEV;

const originMs = typeof performance !== "undefined" ? performance.now() : 0;

let lastMarkMs = originMs;

function formatMs(ms: number): string {
	return `${ms.toFixed(1)}ms`;
}

export function hydrationMark(
	phase: string,
	detail?: Record<string, unknown>,
): void {
	if (!ENABLED) return;

	const now =
		typeof performance !== "undefined" ? performance.now() : Date.now();
	const sinceOrigin = now - originMs;
	const sinceLast = now - lastMarkMs;
	lastMarkMs = now;

	const suffix =
		detail && Object.keys(detail).length > 0
			? ` ${JSON.stringify(detail)}`
			: "";

	console.debug(
		`[hydration +${formatMs(sinceOrigin)} Δ${formatMs(sinceLast)}] ${phase}${suffix}`,
	);
}

/** Log duration for an async step (wallet unlock, WASM, etc.). */
export function hydrationMarkAsyncEnd(
	phase: string,
	startedAt: number,
	detail?: Record<string, unknown>,
): void {
	if (!ENABLED) return;

	const duration =
		(typeof performance !== "undefined" ? performance.now() : Date.now()) -
		startedAt;

	hydrationMark(phase, { ...detail, durationMs: Math.round(duration) });
}

export function hydrationMarkNow(): number {
	return typeof performance !== "undefined" ? performance.now() : Date.now();
}
