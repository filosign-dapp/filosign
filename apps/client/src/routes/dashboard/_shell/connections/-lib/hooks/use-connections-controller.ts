import { useFilosignContext } from "@filosign/react";
import { useSentEmailInvites } from "@filosign/react/sharing";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { invalidateSharingQueriesForConnections } from "@/src/routes/dashboard/_shell/connections/-lib/utils/contacts";

export function useConnectionsController() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const [search, setSearch] = useState("");

	const emailInvites = useSentEmailInvites();

	const filteredInvites = useMemo(() => {
		const invites = emailInvites.data ?? [];
		const q = search.trim().toLowerCase();
		if (!q) return invites;
		return invites.filter(
			(inv) =>
				inv.inviteeEmail.toLowerCase().includes(q) ||
				(inv.message?.toLowerCase().includes(q) ?? false),
		);
	}, [emailInvites.data, search]);

	const onRequestCompleted = () =>
		invalidateSharingQueriesForConnections(queryClient, rpcQuery);

	return {
		search,
		setSearch,
		filteredInvites,
		loadingInvites: emailInvites.isPending,
		onRequestCompleted,
	};
}

export type ConnectionsController = ReturnType<typeof useConnectionsController>;
