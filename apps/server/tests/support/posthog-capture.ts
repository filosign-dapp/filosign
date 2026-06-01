export const posthogCaptures: Record<string, unknown>[] = [];

export function clearPosthogCaptures(): void {
	posthogCaptures.length = 0;
}
