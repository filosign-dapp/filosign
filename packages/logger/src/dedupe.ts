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
	_getMapSize?: () => number;
} {
	const seen = new Map<string, number>();
	const windowMs = Math.max(0, opts.windowMs);

	return {
		shouldSend(event) {
			const now = Date.now();

			// Prune expired entries to prevent memory leaks.
			// Since a JS Map preserves insertion order, scanning from the start yields the oldest entries first.
			// The moment we encounter a non-expired entry, we can break early as all subsequent entries are newer.
			for (const [k, timestamp] of seen.entries()) {
				if (now - timestamp >= windowMs) {
					seen.delete(k);
				} else {
					break;
				}
			}

			const key = `${event.name}|${event.severity}|${event.message}|${stableContext(
				event.context,
			)}`;
			const lastSeen = seen.get(key);
			if (lastSeen && now - lastSeen < windowMs) {
				return false;
			}
			seen.set(key, now);
			return true;
		},
		_getMapSize() {
			return seen.size;
		},
	};
}
