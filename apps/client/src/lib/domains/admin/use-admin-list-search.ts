import { useEffect, useRef, useState } from "react";
import { useDebouncedSearch } from "@/src/lib/utils/use-debounced-search";

const SEARCH_DEBOUNCE_MS = 400;

export function useAdminListSearch(args: {
	q: string | undefined;
	onQChange: (q: string | undefined) => void;
}) {
	const [searchInput, setSearchInput] = useState(args.q ?? "");
	const onQChangeRef = useRef(args.onQChange);
	const { debouncedSearch } = useDebouncedSearch(
		searchInput.trim() || undefined,
		SEARCH_DEBOUNCE_MS,
	);

	useEffect(() => {
		onQChangeRef.current = args.onQChange;
	}, [args.onQChange]);

	useEffect(() => {
		setSearchInput(args.q ?? "");
	}, [args.q]);

	useEffect(() => {
		const nextQ = debouncedSearch?.trim() || undefined;
		if ((args.q ?? undefined) === nextQ) return;
		onQChangeRef.current(nextQ);
	}, [args.q, debouncedSearch]);

	return { searchInput, setSearchInput };
}
