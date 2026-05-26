import { type DraftSummaryRow, useDraftsList } from "@filosign/react/drafts";
import type { OrgFileRow } from "@filosign/react/files";
import { useOrgFiles } from "@filosign/react/files";
import { useActiveOrgId } from "@filosign/react/orgs";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useOpenDraft } from "@/src/lib/domains/drafts/use-open-draft";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

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

export type DraftRowView = Pick<DraftSummaryRow, "id" | "title"> & {
	updatedAt: Date;
};

export type UnifiedItem =
	| {
			id: string;
			title: string;
			date: Date;
			type: "sent" | "received";
			isDraft: false;
			fileRow: OrgFileRowView;
	  }
	| {
			id: string;
			title: string;
			date: Date;
			type: "draft";
			isDraft: true;
			draftRow: DraftRowView;
	  };

export function useDocumentsController() {
	const [viewMode, setViewMode] = useState<"list" | "grid">("list");
	const [activeTab, setActiveTab] = useState<DocumentTab>("all");
	const navigate = useNavigate();
	const activeOrgId = useActiveOrgId();
	const { openDraft } = useOpenDraft();
	const { user } = useThirdweb();

	const userWallet = user?.wallet?.address;
	const walletNorm = useMemo(() => userWallet?.toLowerCase(), [userWallet]);

	const orgFiles = useOrgFiles();
	const draftsList = useDraftsList();

	const allFilesData = useMemo((): OrgFileRowView[] => {
		return (orgFiles.data ?? []).map((file) => {
			const isSent = walletNorm && file.sender?.toLowerCase() === walletNorm;
			return {
				...file,
				type: isSent ? "sent" : "received",
				createdAt: file.createdAt ? new Date(file.createdAt) : new Date(),
			};
		});
	}, [orgFiles.data, walletNorm]);

	const draftsData = useMemo(
		(): DraftRowView[] =>
			(draftsList.data?.drafts ?? []).map((draft) => ({
				id: draft.id,
				title: draft.title,
				updatedAt: new Date(draft.updatedAt),
			})),
		[draftsList.data?.drafts],
	);

	const unifiedItems = useMemo((): UnifiedItem[] => {
		const mappedFiles = allFilesData.map((f) => ({
			id: f.pieceCid,
			title: f.displayName || "Untitled Document",
			date: f.createdAt,
			type: f.type,
			isDraft: false as const,
			fileRow: f,
		}));

		const mappedDrafts = draftsData.map((d) => ({
			id: d.id,
			title: d.title || "Untitled Draft",
			date: d.updatedAt,
			type: "draft" as const,
			isDraft: true as const,
			draftRow: d,
		}));

		return [...mappedFiles, ...mappedDrafts].sort(
			(a, b) => b.date.getTime() - a.date.getTime(),
		);
	}, [allFilesData, draftsData]);

	const filteredItems = useMemo(() => {
		if (activeTab === "all") return unifiedItems;
		if (activeTab === "sent")
			return unifiedItems.filter(
				(item) => !item.isDraft && item.type === "sent",
			);
		if (activeTab === "received")
			return unifiedItems.filter(
				(item) => !item.isDraft && item.type === "received",
			);
		if (activeTab === "drafts")
			return unifiedItems.filter((item) => item.isDraft);
		return unifiedItems;
	}, [unifiedItems, activeTab]);

	const hasAnyContent = unifiedItems.length > 0;

	const isLoading =
		draftsList.isLoading || Boolean(activeOrgId && orgFiles.isLoading);

	const handleViewModeChange = useCallback((newViewMode: "list" | "grid") => {
		setViewMode((prev) => (newViewMode !== prev ? newViewMode : prev));
	}, []);

	const handleItemClick = useCallback(
		(file: OrgFileRow) => {
			void navigate({
				to: "/dashboard/document/sign",
				search: { pieceCid: file.pieceCid },
			});
		},
		[navigate],
	);

	const handleDraftClick = openDraft;

	return useMemo(
		() => ({
			viewMode,
			activeTab,
			setActiveTab,
			activeOrgId,
			orgFilesData: allFilesData,
			draftsData,
			unifiedItems,
			filteredItems,
			hasAnyContent,
			isLoading,
			handleViewModeChange,
			handleItemClick,
			handleDraftClick,
		}),
		[
			viewMode,
			activeTab,
			activeOrgId,
			allFilesData,
			draftsData,
			unifiedItems,
			filteredItems,
			hasAnyContent,
			isLoading,
			handleViewModeChange,
			handleItemClick,
			handleDraftClick,
		],
	);
}

export type DocumentsController = ReturnType<typeof useDocumentsController>;
