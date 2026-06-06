import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	listSupportCenterEntries,
	SUPPORT_CATEGORIES,
	type SupportCategory,
	type SupportCenterEntry,
} from "../support-center";

export type SupportCenterGroup = {
	category: SupportCategory;
	items: SupportCenterEntry[];
};

export function groupEntriesByCategory(
	entries: SupportCenterEntry[],
): SupportCenterGroup[] {
	const byCategory = new Map<SupportCategory, SupportCenterEntry[]>();
	for (const category of SUPPORT_CATEGORIES) {
		byCategory.set(category, []);
	}
	for (const entry of entries) {
		byCategory.get(entry.category)?.push(entry);
	}
	return SUPPORT_CATEGORIES.map((category) => ({
		category,
		items: (byCategory.get(category) ?? []).sort((a, b) =>
			a.title.localeCompare(b.title),
		),
	})).filter((group) => group.items.length > 0);
}

export function entryMatchesQuery(
	entry: SupportCenterEntry,
	query: string,
): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	const haystack = [
		entry.title,
		entry.description,
		entry.code,
		entry.supportSlug,
		...entry.steps,
	].join(" ");
	return haystack.toLowerCase().includes(q);
}

export function useSupportCenterPanel() {
	const allEntries = useMemo(() => listSupportCenterEntries(), []);
	const [query, setQuery] = useState("");
	const [openSlug, setOpenSlug] = useState<string | null>(null);
	const syncingHashRef = useRef(false);

	const filteredEntries = useMemo(
		() => allEntries.filter((entry) => entryMatchesQuery(entry, query)),
		[allEntries, query],
	);

	const grouped = useMemo(
		() => groupEntriesByCategory(filteredEntries),
		[filteredEntries],
	);

	const openFromHash = useCallback(() => {
		const hash = decodeURIComponent(window.location.hash.slice(1));
		if (!hash) return;
		const exists = allEntries.some((entry) => entry.supportSlug === hash);
		if (!exists) return;
		setOpenSlug(hash);
		requestAnimationFrame(() => {
			document.getElementById(hash)?.scrollIntoView({
				block: "start",
				behavior: "smooth",
			});
		});
	}, [allEntries]);

	useEffect(() => {
		openFromHash();
		window.addEventListener("hashchange", openFromHash);
		return () => window.removeEventListener("hashchange", openFromHash);
	}, [openFromHash]);

	useEffect(() => {
		if (syncingHashRef.current) {
			syncingHashRef.current = false;
			return;
		}
		if (openSlug && window.location.hash.slice(1) !== openSlug) {
			syncingHashRef.current = true;
			window.history.replaceState(null, "", `#${openSlug}`);
		}
	}, [openSlug]);

	return {
		query,
		setQuery,
		openSlug,
		setOpenSlug,
		grouped,
	};
}
