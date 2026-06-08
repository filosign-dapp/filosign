import { useDraftsList, type DraftSummaryRow } from "@filosign/react/drafts";
import type { OrgFileRow } from "@filosign/react/files";
import {
	useOrgFiles,
	useReceivedFiles,
	useSentFiles,
} from "@filosign/react/files";
import { useActiveOrgId } from "@filosign/react/orgs";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useOpenDraft } from "@/src/lib/domains/drafts";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

const documentAllRouteApi = getRouteApi("/dashboard/_shell/document/all/");

export const DOCUMENT_TABS = ["all", "sent", "received", "drafts"] as const;
export type DocumentTab = (typeof DOCUMENT_TABS)[number];

export function parseDocumentTab(val: string): DocumentTab | null {
	return (DOCUMENT_TABS as readonly string[]).includes(val)
		? (val as DocumentTab)
		: null;
}

export type OrgFileRowView = OrgFileRow & {
	type: "sent" | "received";
	createdAt: Date;
};

export type DocumentListItem =
	| {
			kind: "file";
			id: string;
			title: string;
			date: Date;
			type: "sent" | "received";
			fileRow: OrgFileRowView;
	  }
	| {
			kind: "draft";
			id: string;
			title: string;
			date: Date;
			draftRow: DraftSummaryRow;
	  };

export function useDocumentsController() {
	const [viewMode, setViewMode] = useState<"list" | "grid">("list");
	const { tab: tabSearch } = documentAllRouteApi.useSearch();
	const activeTab = parseDocumentTab(tabSearch ?? "") ?? "all";
	const navigate = useNavigate();
	const { openDraft } = useOpenDraft();

	const setActiveTab = useCallback(
		(tab: DocumentTab) => {
			void navigate({
				to: "/dashboard/document/all",
				search: (prev) => ({
					...prev,
					tab: tab === "all" ? undefined : tab,
				}),
				replace: true,
			});
		},
		[navigate],
	);
	const activeOrgId = useActiveOrgId();
	const { user } = useThirdweb();

	const userWallet = user?.wallet?.address;
	const walletNorm = useMemo(() => userWallet?.toLowerCase(), [userWallet]);

	const orgFiles = useOrgFiles();
	const sentFiles = useSentFiles();
	const receivedFiles = useReceivedFiles();
	const draftsList = useDraftsList();

	const allFilesData = useMemo((): OrgFileRowView[] => {
		const mergedMap = new Map<string, OrgFileRowView>();

		const processFile = (file: OrgFileRow) => {
			if (!file.pieceCid) return;
			const isSent = walletNorm && file.sender?.toLowerCase() === walletNorm;
			mergedMap.set(file.pieceCid, {
				...file,
				type: isSent ? "sent" : "received",
				createdAt: file.createdAt ? new Date(file.createdAt) : new Date(),
			});
		};

		for (const file of orgFiles.data ?? []) {
			processFile(file);
		}
		for (const file of sentFiles.data ?? []) {
			processFile(file);
		}
		for (const file of receivedFiles.data ?? []) {
			processFile(file);
		}

		return Array.from(mergedMap.values());
	}, [orgFiles.data, sentFiles.data, receivedFiles.data, walletNorm]);

	const fileItems = useMemo((): DocumentListItem[] => {
		return allFilesData.map((file) => ({
			kind: "file",
			id: file.pieceCid,
			title: file.displayName || "Untitled Document",
			date: file.createdAt,
			type: file.type,
			fileRow: file,
		}));
	}, [allFilesData]);

	const draftItems = useMemo((): DocumentListItem[] => {
		return (draftsList.data?.drafts ?? []).map((draft) => ({
			kind: "draft",
			id: draft.id,
			title: draft.title,
			date: new Date(draft.updatedAt),
			draftRow: draft,
		}));
	}, [draftsList.data?.drafts]);

	const items = useMemo((): DocumentListItem[] => {
		return [...fileItems, ...draftItems].sort(
			(a, b) => b.date.getTime() - a.date.getTime(),
		);
	}, [fileItems, draftItems]);

	const filteredItems = useMemo(() => {
		if (activeTab === "sent") {
			return items.filter(
				(item): item is Extract<DocumentListItem, { kind: "file" }> =>
					item.kind === "file" && item.type === "sent",
			);
		}
		if (activeTab === "received") {
			return items.filter(
				(item): item is Extract<DocumentListItem, { kind: "file" }> =>
					item.kind === "file" && item.type === "received",
			);
		}
		if (activeTab === "drafts") {
			return items.filter(
				(item): item is Extract<DocumentListItem, { kind: "draft" }> =>
					item.kind === "draft",
			);
		}
		return items;
	}, [items, activeTab]);

	const hasAnyContent = items.length > 0;

	const isLoading =
		Boolean(activeOrgId && orgFiles.isLoading) ||
		sentFiles.isLoading ||
		receivedFiles.isLoading ||
		draftsList.isLoading;

	const handleViewModeChange = useCallback((newViewMode: "list" | "grid") => {
		setViewMode((prev) => (newViewMode !== prev ? newViewMode : prev));
	}, []);

	const handleFileClick = useCallback(
		(file: OrgFileRow) => {
			void navigate({
				to: "/dashboard/document/sign",
				search: { pieceCid: file.pieceCid },
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
			activeOrgId,
			orgFilesData: allFilesData,
			items,
			filteredItems,
			hasAnyContent,
			isLoading,
			handleViewModeChange,
			handleFileClick,
			handleDraftClick,
		}),
		[
			viewMode,
			activeTab,
			setActiveTab,
			activeOrgId,
			allFilesData,
			items,
			filteredItems,
			hasAnyContent,
			isLoading,
			handleViewModeChange,
			handleFileClick,
			handleDraftClick,
		],
	);
}

export type DocumentsController = ReturnType<typeof useDocumentsController>;
