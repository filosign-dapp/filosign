import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { filosignKeys } from "../../lib/query-keys";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useAcceptedRecipients } from "./useSendableTo";

export function useAcceptedPeople() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const { data: acceptedRecipients } = useAcceptedRecipients();

	const recipientWallets = useMemo(
		() =>
			(acceptedRecipients ?? [])
				.map((request) => request.recipientWallet.toLowerCase())
				.sort(),
		[acceptedRecipients],
	);

	return useQuery({
		queryKey: filosignKeys.acceptedPeople(recipientWallets),
		queryFn: async () => {
			if (!acceptedRecipients || !isAuthed) return { people: [] };

			const people = await Promise.all(
				acceptedRecipients.map(async (request) => {
					try {
						const profile = await rpcQuery.users.profile.lookup.call({
							query: request.recipientWallet,
						});
						return {
							walletAddress: profile.walletAddress,
							displayName: profile.firstName
								? `${profile.firstName} ${profile.lastName || ""}`.trim()
								: null,
							username: null,
							avatarUrl: profile.avatarUrl,
							email: profile.email ?? null,
						};
					} catch {
						return {
							walletAddress: request.recipientWallet,
							displayName: null,
							username: null,
							avatarUrl: null,
							email: null,
						};
					}
				}),
			);

			return { people };
		},
		enabled: !!acceptedRecipients && isAuthed,
	});
}
