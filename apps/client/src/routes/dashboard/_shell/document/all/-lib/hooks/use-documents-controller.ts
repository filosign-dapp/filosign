import {
	useOrgFiles,
	useReceivedFiles,
	useSentFiles,
} from "@filosign/react/files";
import { useActiveOrgId } from "@filosign/react/orgs";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export function useDocumentsController() {
	const [viewMode, setViewMode] = useState<"list" | "grid">("list");
	const [isFilterOpen, _setIsFilterOpen] = useState(false);
	const navigate = useNavigate();
	const activeOrgId = useActiveOrgId();

	const sentFiles = useSentFiles();
	const receivedFiles = useReceivedFiles();
	const orgFiles = useOrgFiles();

	const sentFilesData = Array.isArray(sentFiles.data)
		? sentFiles.data.map((file) => ({
				...file,
				type: "sent" as const,
				createdAt: (file as { createdAt?: Date }).createdAt || new Date(),
			}))
		: [];

	const receivedFilesData = Array.isArray(receivedFiles.data)
		? receivedFiles.data.map((file) => ({
				...file,
				type: "received" as const,
				createdAt: (file as { createdAt?: Date }).createdAt || new Date(),
			}))
		: [];

	const orgFilesData =
		activeOrgId && Array.isArray(orgFiles.data)
			? orgFiles.data.map((file) => {
					const row = file as {
						pieceCid: string;
						createdAt?: Date;
						[key: string]: unknown;
					};
					return {
						...row,
						type: "org" as const,
						createdAt: row.createdAt ?? new Date(),
					};
				})
			: [];

	const allFiles = [...sentFilesData, ...receivedFilesData, ...orgFilesData];

	const isLoading =
		sentFiles.isLoading ||
		receivedFiles.isLoading ||
		Boolean(activeOrgId && orgFiles.isLoading);

	const handleViewModeChange = (newViewMode: "list" | "grid") => {
		if (newViewMode !== viewMode) {
			setViewMode(newViewMode);
		}
	};

	const handleItemClick = (file: {
		pieceCid: string;
		[key: string]: unknown;
	}) => {
		void navigate({
			to: "/dashboard/document/sign",
			search: { pieceCid: file.pieceCid },
		});
	};

	return {
		viewMode,
		isFilterOpen,
		activeOrgId,
		sentFilesData,
		receivedFilesData,
		orgFilesData,
		allFiles,
		isLoading,
		handleViewModeChange,
		handleItemClick,
	};
}

export type DocumentsController = ReturnType<typeof useDocumentsController>;
