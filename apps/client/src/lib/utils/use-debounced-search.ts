import { useEffect, useState } from "react";

function isUnset<T>(value: T | undefined): boolean {
	if (value === undefined || value === null) return true;
	if (typeof value === "string") return value.trim() === "";
	return false;
}

/** Debounces a search value; clears pending output while the input changes. */
export function useDebouncedSearch<T>(search: T | undefined, delayMs = 400) {
	const [debouncedSearch, setDebouncedSearch] = useState<T | undefined>();

	useEffect(() => {
		if (isUnset(search)) {
			setDebouncedSearch(undefined);
			return;
		}
		setDebouncedSearch(undefined);
		const t = setTimeout(() => setDebouncedSearch(search), delayMs);
		return () => clearTimeout(t);
	}, [search, delayMs]);

	const isSettled = !isUnset(search) && debouncedSearch === search;

	return { debouncedSearch, isSettled };
}
