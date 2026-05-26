import {
	useOrgFiles,
	useReceivedFiles,
	useSentFiles,
} from "@filosign/react/files";
import { useActiveOrgId } from "@filosign/react/orgs";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useFileInfosByPieceCids } from "@/src/lib/domains/files/hooks/use-file-infos-by-piece-cids";

export function useDocumentsController() {
	const [viewMode, setViewMode] = useState<"list" | "grid">("list");
	const [isFilterOpen, _setIsFilterOpen] = useState(false);
	const navigate = useNavigate();
	const activeOrgId = useActiveOrgId();

	const sentFiles = useSentFiles();
	const receivedFiles = useReceivedFiles();
	const orgFiles = useOrgFiles();

	const sentFilesData = useMemo(
		() =>
			Array.isArray(sentFiles.data)
				? sentFiles.data.map((file) => ({
						...file,
						type: "sent" as const,
						createdAt: (file as { createdAt?: Date }).createdAt || new Date(),
					}))
				: [],
		[sentFiles.data],
	);

	const receivedFilesData = useMemo(
		() =>
			Array.isArray(receivedFiles.data)
				? receivedFiles.data.map((file) => ({
						...file,
						type: "received" as const,
						createdAt: (file as { createdAt?: Date }).createdAt || new Date(),
					}))
				: [],
		[receivedFiles.data],
	);

	const orgFilesData = useMemo(
		() =>
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
				: [],
		[activeOrgId, orgFiles.data],
	);

	const allFiles = useMemo(
		() => [...sentFilesData, ...receivedFilesData, ...orgFilesData],
		[sentFilesData, receivedFilesData, orgFilesData],
	);

	const pieceCids = useMemo(() => allFiles.map((f) => f.pieceCid), [allFiles]);

	const fileInfos = useFileInfosByPieceCids(pieceCids);

	const isLoading =
		sentFiles.isLoading ||
		receivedFiles.isLoading ||
		Boolean(activeOrgId && orgFiles.isLoading);

	const handleViewModeChange = useCallback((newViewMode: "list" | "grid") => {
		setViewMode((prev) => (newViewMode !== prev ? newViewMode : prev));
	}, []);

	const handleItemClick = useCallback(
		(file: { pieceCid: string; [key: string]: unknown }) => {
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
			isFilterOpen,
			activeOrgId,
			sentFilesData,
			receivedFilesData,
			orgFilesData,
			allFiles,
			fileInfoByPieceCid: fileInfos.byPieceCid,
			isLoading,
			handleViewModeChange,
			handleItemClick,
		}),
		[
			viewMode,
			isFilterOpen,
			activeOrgId,
			sentFilesData,
			receivedFilesData,
			orgFilesData,
			allFiles,
			fileInfos.byPieceCid,
			isLoading,
			handleViewModeChange,
			handleItemClick,
		],
	);
}

export type DocumentsController = ReturnType<typeof useDocumentsController>;
