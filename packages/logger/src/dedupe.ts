import type { LoggerEvent } from "./types";

function stableContext(context: Record<string, unknown> | undefined): string {
	if (!context) return "";

	const entries = Object.entries(context).sort(([a], [b]) =>
		a.localeCompare(b),
	);
	return JSON.stringify(entries);
}

export function createInMemoryDedupe(opts: { windowMs: number }): {
	shouldSend(event: LoggerEvent): boolean;
} {
	const seen = new Map<string, number>();
	const windowMs = Math.max(0, opts.windowMs);

	return {
		shouldSend(event) {
			const key = `${event.name}|${event.severity}|${event.message}|${stableContext(
				event.context,
			)}`;
			const now = Date.now();
			const lastSeen = seen.get(key);
			if (lastSeen && now - lastSeen < windowMs) {
				return false;
			}
			seen.set(key, now);
			return true;
		},
	};
}
