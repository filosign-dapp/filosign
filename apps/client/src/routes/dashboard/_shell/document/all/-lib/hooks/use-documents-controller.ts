import type { OrgFileRow } from "@filosign/react/files";
import {
	useOrgFiles,
	useReceivedFiles,
	useSentFiles,
} from "@filosign/react/files";
import { useActiveOrgId } from "@filosign/react/orgs";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

export const DOCUMENT_TABS = ["all", "sent", "received"] as const;
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

export type DocumentItem = {
	id: string;
	title: string;
	date: Date;
	type: "sent" | "received";
	fileRow: OrgFileRowView;
};

export function useDocumentsController() {
	const [viewMode, setViewMode] = useState<"list" | "grid">("list");
	const [activeTab, setActiveTab] = useState<DocumentTab>("all");
	const navigate = useNavigate();
	const activeOrgId = useActiveOrgId();
	const { user } = useThirdweb();

	const userWallet = user?.wallet?.address;
	const walletNorm = useMemo(() => userWallet?.toLowerCase(), [userWallet]);

	const orgFiles = useOrgFiles();
	const sentFiles = useSentFiles();
	const receivedFiles = useReceivedFiles();

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

	const items = useMemo((): DocumentItem[] => {
		return allFilesData
			.map((file) => ({
				id: file.pieceCid,
				title: file.displayName || "Untitled Document",
				date: file.createdAt,
				type: file.type,
				fileRow: file,
			}))
			.sort((a, b) => b.date.getTime() - a.date.getTime());
	}, [allFilesData]);

	const filteredItems = useMemo(() => {
		if (activeTab === "sent") {
			return items.filter((item) => item.type === "sent");
		}
		if (activeTab === "received") {
			return items.filter((item) => item.type === "received");
		}
		return items;
	}, [items, activeTab]);

	const hasAnyContent = items.length > 0;

	const isLoading =
		Boolean(activeOrgId && orgFiles.isLoading) ||
		sentFiles.isLoading ||
		receivedFiles.isLoading;

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
			handleItemClick,
		}),
		[
			viewMode,
			activeTab,
			activeOrgId,
			allFilesData,
			items,
			filteredItems,
			hasAnyContent,
			isLoading,
			handleViewModeChange,
			handleItemClick,
		],
	);
}

export type DocumentsController = ReturnType<typeof useDocumentsController>;
