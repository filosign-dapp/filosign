/**
 * Time-ordered UUID v7 for primary keys (friendlier B-tree inserts than v4).
 *
 * Uses {@link Bun.randomUUIDv7} (requires Bun runtime). Drizzle `$defaultFn`
 * applies this on INSERT when `id` is omitted — no PostgreSQL extension needed.
 */
export function randomUuidV7(): string {
	return Bun.randomUUIDv7();
}
