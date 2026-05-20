import { useFilosignContext } from "@filosign/react";
import {
	useAcceptedPeople,
	useApproveSender,
	useCancelRequest,
	useReceivableFrom,
	useReceivedRequests,
	useRejectRequest,
	useSendableTo,
	useSentRequests,
} from "@filosign/react/sharing";
import { useProfilesByAddresses } from "@filosign/react/users";
import { useQueryClient } from "@tanstack/react-query";
import { type ComponentProps, useMemo, useState } from "react";
import type { Address } from "viem";
import { getAddress } from "viem";
import type { Tabs } from "@/src/lib/components/ui/tabs";
import {
	buildContacts,
	type ConnectionsTab,
	invalidateQueriesForTab,
	invalidateSharingQueriesForConnections,
	sortPendingRequestRows,
} from "@/src/routes/dashboard/_shell/connections/-lib/utils/contacts";

export function useConnectionsController() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const [activeTab, setActiveTab] = useState<ConnectionsTab>("contacts");
	const [search, setSearch] = useState("");

	const receivedRequests = useReceivedRequests();
	const sentRequests = useSentRequests();
	const acceptedPeople = useAcceptedPeople();
	const sendableTo = useSendableTo();
	const receivableFrom = useReceivableFrom();

	const approveIncoming = useApproveSender();
	const rejectRequest = useRejectRequest();
	const cancelRequest = useCancelRequest();

	const contacts = useMemo(
		() =>
			buildContacts(acceptedPeople.data, sendableTo.data, receivableFrom.data),
		[acceptedPeople.data, sendableTo.data, receivableFrom.data],
	);

	const recipientAddresses = useMemo(
		() => contacts.map((c) => getAddress(c.wallet as Address)),
		[contacts],
	);

	const profileByWallet = useProfilesByAddresses(
		recipientAddresses.length > 0 ? recipientAddresses : undefined,
	);

	const filteredContacts = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return contacts;
		return contacts.filter((c) => {
			const wallet = c.wallet.toLowerCase();
			const name = (c.displayName || "").toLowerCase();
			const email =
				profileByWallet.data
					?.get(getAddress(c.wallet as Address))
					?.email?.toLowerCase() ?? "";
			return wallet.includes(q) || name.includes(q) || email.includes(q);
		});
	}, [contacts, search, profileByWallet.data]);

	const pendingIncoming =
		receivedRequests.data?.filter((r) => r.status === "PENDING") ?? [];
	const pendingOutgoing =
		sentRequests.data?.filter((r) => r.status === "PENDING") ?? [];

	const pendingWalletCount = pendingIncoming.length + pendingOutgoing.length;

	const sortedPendingRows = useMemo(
		() => sortPendingRequestRows(pendingIncoming, pendingOutgoing),
		[pendingIncoming, pendingOutgoing],
	);

	const loadingContacts =
		acceptedPeople.isPending ||
		sendableTo.isPending ||
		receivableFrom.isPending ||
		profileByWallet.isLoading;

	const loadingRequests = receivedRequests.isPending || sentRequests.isPending;

	const handleTabChange: NonNullable<
		ComponentProps<typeof Tabs>["onValueChange"]
	> = (next) => {
		const tab = next as ConnectionsTab;
		setActiveTab(tab);
		invalidateQueriesForTab(queryClient, rpcQuery, tab);
	};

	const onRequestCompleted = () =>
		invalidateSharingQueriesForConnections(queryClient, rpcQuery);

	return {
		activeTab,
		handleTabChange,
		search,
		setSearch,
		contacts,
		filteredContacts,
		profileByWallet,
		sortedPendingRows,
		pendingWalletCount,
		loadingContacts,
		loadingRequests,
		approveIncoming,
		rejectRequest,
		cancelRequest,
		onRequestCompleted,
	};
}

export type ConnectionsController = ReturnType<typeof useConnectionsController>;
