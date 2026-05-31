/** Drizzle-like thenable with optional `.limit()` for test mocks. */
export function dbQueryResult<T>(rows: T[]) {
	const promise = Promise.resolve(rows);
	return Object.assign(promise, {
		limit: () => Promise.resolve(rows),
	});
}
