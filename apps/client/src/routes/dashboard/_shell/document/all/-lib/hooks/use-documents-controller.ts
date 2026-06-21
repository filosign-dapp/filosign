import {
	type DocumentListRow,
	flattenDocumentsListPages,
	useDocumentsList,
	useDocumentsListInfinite,
} from "@filosign/react/documents";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOpenDraft } from "@/src/lib/domains/drafts";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { useDebouncedSearch } from "@/src/lib/utils/use-debounced-search";

const documentAllRouteApi = getRouteApi("/dashboard/_shell/document/all/");

export const DOCUMENT_TABS = ["all", "sent", "received", "drafts"] as const;
export type DocumentTab = (typeof DOCUMENT_TABS)[number];

export function parseDocumentTab(val: string): DocumentTab | null {
	return (DOCUMENT_TABS as readonly string[]).includes(val)
		? (val as DocumentTab)
		: null;
}

export type { DocumentListRow };

const SEARCH_DEBOUNCE_MS = 300;

function documentAllSearch(args: {
	tab?: DocumentTab;
	q?: string;
	upgrade?: string;
	interval?: string;
}) {
	return {
		upgrade: args.upgrade,
		interval: args.interval,
		q: args.q,
		tab: args.tab && args.tab !== "all" ? args.tab : undefined,
	};
}

export function useDocumentsController() {
	const viewMode = useStorePersist((s) => s.documentsViewMode);
	const setDocumentsViewMode = useStorePersist((s) => s.setDocumentsViewMode);
	const {
		tab: tabSearch,
		q: qSearch,
		upgrade,
		interval,
	} = documentAllRouteApi.useSearch();
	const activeTab = parseDocumentTab(tabSearch ?? "") ?? "all";
	const navigate = useNavigate();
	const { openDraft } = useOpenDraft();

	const [searchInput, setSearchInput] = useState(qSearch ?? "");
	const { debouncedSearch: debouncedQuery } = useDebouncedSearch(
		searchInput.trim() || undefined,
		SEARCH_DEBOUNCE_MS,
	);

	useEffect(() => {
		setSearchInput(qSearch ?? "");
	}, [qSearch]);

	useEffect(() => {
		const nextQ = debouncedQuery?.trim() || undefined;
		if ((qSearch ?? undefined) === nextQ) return;
		void navigate({
			to: "/dashboard/document/all",
			search: documentAllSearch({
				tab: activeTab,
				q: nextQ,
				upgrade,
				interval,
			}),
			replace: true,
		});
	}, [activeTab, debouncedQuery, interval, navigate, qSearch, upgrade]);

	const setActiveTab = useCallback(
		(tab: DocumentTab) => {
			void navigate({
				to: "/dashboard/document/all",
				search: documentAllSearch({
					tab,
					q: qSearch,
					upgrade,
					interval,
				}),
				replace: true,
			});
		},
		[interval, navigate, qSearch, upgrade],
	);

	const listQuery = useDocumentsListInfinite({
		tab: activeTab,
		q: debouncedQuery,
	});
	const presenceQuery = useDocumentsList({ tab: "all", limit: 1 });

	const items = useMemo(
		(): DocumentListRow[] =>
			flattenDocumentsListPages<DocumentListRow>(listQuery.data?.pages),
		[listQuery.data?.pages],
	);

	const hasAnyContent = (presenceQuery.data?.items.length ?? 0) > 0;
	const isLoading = listQuery.isLoading || presenceQuery.isLoading;
	const hasSearchQuery = Boolean(debouncedQuery?.trim());

	const handleViewModeChange = useCallback(
		(newViewMode: "list" | "grid") => {
			if (newViewMode !== viewMode) {
				setDocumentsViewMode(newViewMode);
			}
		},
		[viewMode, setDocumentsViewMode],
	);

	const handleFileClick = useCallback(
		(pieceCid: string) => {
			void navigate({
				to: "/dashboard/document/sign",
				search: { pieceCid },
			});
		},
		[navigate],
	);

	const handleDraftClick = useCallback(
		(draftId: string) => {
			openDraft(draftId);
		},
		[openDraft],
	);

	return useMemo(
		() => ({
			viewMode,
			activeTab,
			setActiveTab,
			items,
			hasAnyContent,
			isLoading,
			searchInput,
			setSearchInput,
			hasSearchQuery,
			fetchNextPage: listQuery.fetchNextPage,
			hasNextPage: listQuery.hasNextPage ?? false,
			isFetchingNextPage: listQuery.isFetchingNextPage,
			handleViewModeChange,
			handleFileClick,
			handleDraftClick,
		}),
		[
			viewMode,
			activeTab,
			setActiveTab,
			items,
			hasAnyContent,
			isLoading,
			searchInput,
			hasSearchQuery,
			listQuery.fetchNextPage,
			listQuery.hasNextPage,
			listQuery.isFetchingNextPage,
			handleViewModeChange,
			handleFileClick,
			handleDraftClick,
		],
	);
}

export type DocumentsController = ReturnType<typeof useDocumentsController>;
