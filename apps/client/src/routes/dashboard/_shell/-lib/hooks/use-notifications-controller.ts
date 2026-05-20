import { useFilosignContext } from "@filosign/react";
import { useReceivedFiles } from "@filosign/react/files";
import { useApproveSender, useReceivedRequests } from "@filosign/react/sharing";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useFileInfosByPieceCids } from "@/src/lib/domains/files/hooks/use-file-infos-by-piece-cids";
import { invalidateInboxQueries } from "@/src/lib/query/invalidate-inbox";

export function useNotificationsController() {
	const [open, setOpen] = useState(false);
	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
	const [pendingAcceptRequestId, setPendingAcceptRequestId] = useState<
		string | null
	>(null);
	const [pendingAcceptWallet, setPendingAcceptWallet] = useState<string | null>(
		null,
	);

	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const inboxEnabled = open;
	const receivedRequests = useReceivedRequests({ enabled: inboxEnabled });
	const receivedFiles = useReceivedFiles({ enabled: inboxEnabled });
	const allowSharing = useApproveSender();

	const pendingRequests = useMemo(
		() =>
			receivedRequests.data && Array.isArray(receivedRequests.data)
				? receivedRequests.data.filter((req) => req.status === "PENDING")
				: [],
		[receivedRequests.data],
	);

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

	const notificationCount = useMemo(() => {
		const count = allReceivedFiles.length + pendingRequests.length;
		return count;
	}, [allReceivedFiles.length, pendingRequests.length]);

	const isLoading = receivedRequests.isLoading || receivedFiles.isLoading;
	const isFetching = receivedRequests.isFetching || receivedFiles.isFetching;

	const formatAddress = (address: string) =>
		`${address.slice(0, 6)}...${address.slice(-4)}`;

	const handleAllowSharing = (requestId: string, senderWallet: string) => {
		setPendingAcceptRequestId(requestId);
		setPendingAcceptWallet(senderWallet);
		setConfirmDialogOpen(true);
	};

	const confirmAllowSharing = async () => {
		if (!pendingAcceptRequestId || !pendingAcceptWallet) return;

		try {
			await allowSharing.mutateAsync({
				sender: pendingAcceptWallet as `0x${string}`,
				establishMutualConnection: true,
				shareRequestId: pendingAcceptRequestId,
			});
			toast.success("Sharing request accepted!");
			await invalidateInboxQueries(queryClient, rpcQuery);
			setConfirmDialogOpen(false);
			setPendingAcceptRequestId(null);
			setPendingAcceptWallet(null);
		} catch (error) {
			console.error("Failed to accept sharing request:", error);
			toast.error("Failed to accept sharing request");
		}
	};

	const refetchInbox = () => {
		void receivedRequests.refetch();
		void receivedFiles.refetch();
	};

	const closeConfirmDialog = () => {
		setConfirmDialogOpen(false);
		setPendingAcceptRequestId(null);
		setPendingAcceptWallet(null);
	};

	return {
		open,
		setOpen,
		confirmDialogOpen,
		setConfirmDialogOpen,
		notificationCount,
		isLoading,
		isFetching,
		pendingRequests,
		allReceivedFiles,
		fileInfoByPieceCid: fileInfos.byPieceCid,
		formatAddress,
		handleAllowSharing,
		confirmAllowSharing,
		closeConfirmDialog,
		allowSharing,
		refetchInbox,
	};
}

export type NotificationsController = ReturnType<
	typeof useNotificationsController
>;
