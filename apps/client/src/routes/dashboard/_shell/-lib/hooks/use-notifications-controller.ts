import { useFilosignContext } from "@filosign/react";
import { invalidateNotificationsInbox } from "@filosign/react/invalidate-queries";
import {
	type NotificationInboxItem,
	useNotificationsInbox,
} from "@filosign/react/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export function useNotificationsController() {
	const [open, setOpen] = useState(false);

	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const inbox = useNotificationsInbox();

	useEffect(() => {
		if (open) void inbox.refetch();
	}, [open]);

	const items = useMemo(
		(): NotificationInboxItem[] => inbox.data?.items ?? [],
		[inbox.data?.items],
	);

	const notificationCount = inbox.data?.unreadCount ?? 0;
	const isLoading = inbox.isLoading;
	const isFetching = inbox.isFetching;

	const refetchInbox = () => {
		void inbox.refetch();
		void invalidateNotificationsInbox(queryClient, rpcQuery);
	};

	return {
		open,
		setOpen,
		notificationCount,
		isLoading,
		isFetching,
		items,
		refetchInbox,
	};
}

export type NotificationsController = ReturnType<
	typeof useNotificationsController
>;
