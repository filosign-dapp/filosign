import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	listSupportCenterEntries,
	SUPPORT_CATEGORIES,
	type SupportCategory,
	type SupportCenterEntry,
} from "../support-center";
import styles from "./support-center-panel.module.css";
import { renderSupportStepHtml } from "./support-step-html";

export type SupportCenterPanelProps = {
	showHeader?: boolean;
	title?: string;
	lead?: string;
	docsCrossLinkUrl?: string;
	appCrossLinkUrl?: string;
};

function groupEntriesByCategory(
	entries: SupportCenterEntry[],
): { category: SupportCategory; items: SupportCenterEntry[] }[] {
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

function entryMatchesQuery(entry: SupportCenterEntry, query: string): boolean {
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

function SearchIcon() {
	return (
		<svg
			className={styles.searchIcon}
			viewBox="0 0 16 16"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10Zm6 1-3.2-3.2"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}

export function SupportCenterPanel({
	showHeader = true,
	title = "Support Center",
	lead = "Search for the message you see in the app, open the matching topic, and follow the steps in order.",
	docsCrossLinkUrl,
	appCrossLinkUrl,
}: SupportCenterPanelProps) {
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
		const exists = allEntries.some((e) => e.supportSlug === hash);
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

	return (
		<div className={styles.root}>
			{showHeader ? (
				<header className={styles.header}>
					<h1 className={styles.title}>{title}</h1>
					<p className={styles.lead}>{lead}</p>
				</header>
			) : null}

			<div className={styles.searchWrap}>
				<SearchIcon />
				<input
					type="search"
					className={styles.searchInput}
					placeholder="Search by error message or topic…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					aria-label="Search support topics"
				/>
			</div>

			{grouped.length === 0 ? (
				<p className={styles.empty}>
					No topics match that search. Try words from the exact error message.
				</p>
			) : (
				grouped.map((group) => (
					<section
						key={group.category}
						className={styles.section}
						aria-labelledby={`support-${group.category}`}
					>
						<h2
							id={`support-${group.category}`}
							className={styles.sectionLabel}
						>
							{group.category}
						</h2>
						{group.items.map((entry) => (
							<details
								key={entry.supportSlug}
								id={entry.supportSlug}
								className={styles.topic}
								open={openSlug === entry.supportSlug}
								onToggle={(e) => {
									const open = e.currentTarget.open;
									setOpenSlug(open ? entry.supportSlug : null);
								}}
							>
								<summary className={styles.topicSummary}>
									<span className="min-w-0 flex-1">
										<span className={styles.topicTitle}>{entry.title}</span>
										<span className={styles.topicDescription}>
											{entry.description}
										</span>
									</span>
								</summary>
								<div className={styles.topicBody}>
									{entry.steps.length > 0 ? (
										<ol className={styles.steps}>
											{entry.steps.map((step) => (
												<li
													key={step}
													dangerouslySetInnerHTML={{
														__html: renderSupportStepHtml(step),
													}}
												/>
											))}
										</ol>
									) : (
										<p className={styles.empty}>
											Expand this topic for step-by-step guidance.
										</p>
									)}
								</div>
							</details>
						))}
					</section>
				))
			)}

			<p className={styles.footer}>
				Still need help? Email{" "}
				<a href="mailto:support@filosign.xyz">support@filosign.xyz</a>.
				{docsCrossLinkUrl ? (
					<>
						{" "}
						<a href={docsCrossLinkUrl}>Browse all docs</a>
					</>
				) : null}
				{appCrossLinkUrl ? (
					<>
						{" "}
						Signed in?{" "}
						<a href={appCrossLinkUrl}>Open Support Center in the app</a>.
					</>
				) : null}
			</p>
		</div>
	);
}
