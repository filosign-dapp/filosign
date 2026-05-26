import { useFilosignContext } from "@filosign/react";
import { useReceivedFiles } from "@filosign/react/files";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useFileInfosByPieceCids } from "@/src/lib/domains/files/hooks/use-file-infos-by-piece-cids";
import { invalidateInboxQueries } from "@/src/lib/query/invalidate-inbox";

export function useNotificationsController() {
	const [open, setOpen] = useState(false);

	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const inboxEnabled = open;
	const receivedFiles = useReceivedFiles({ enabled: inboxEnabled });

	const allReceivedFiles = useMemo(
		() =>
			receivedFiles.data && Array.isArray(receivedFiles.data)
				? receivedFiles.data
				: [],
		[receivedFiles.data],
	);

	const pieceCids = useMemo(
		() => allReceivedFiles.map((f) => f.pieceCid),
		[allReceivedFiles],
	);

	const fileInfos = useFileInfosByPieceCids(inboxEnabled ? pieceCids : []);

	const notificationCount = allReceivedFiles.length;

	const isLoading = receivedFiles.isLoading;
	const isFetching = receivedFiles.isFetching;

	const formatAddress = (address: string) =>
		`${address.slice(0, 6)}...${address.slice(-4)}`;

	const refetchInbox = () => {
		void receivedFiles.refetch();
		void invalidateInboxQueries(queryClient, rpcQuery);
	};

	return {
		open,
		setOpen,
		notificationCount,
		isLoading,
		isFetching,
		allReceivedFiles,
		fileInfoByPieceCid: fileInfos.byPieceCid,
		formatAddress,
		refetchInbox,
	};
}

export type NotificationsController = ReturnType<
	typeof useNotificationsController
>;
