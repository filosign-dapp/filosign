import { ilike, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm/column";

/** Escape `%`, `_`, and `\` for safe ILIKE patterns. */
export function escapeIlikePattern(q: string): string {
	return q.replace(/[%_\\]/g, "\\$&");
}

export function titleIlike(
	column: AnyColumn,
	q: string | undefined,
): SQL | undefined {
	const trimmed = q?.trim();
	if (!trimmed) return undefined;
	return ilike(column, `%${escapeIlikePattern(trimmed)}%`);
}
