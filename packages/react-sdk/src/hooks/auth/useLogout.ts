import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { filosignKeys } from "../../lib/query-keys";
import { clearSessionSeed } from "./session-seed";

export function useLogout() {
	const { wallet, session, rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ["fsM-logout"],
		mutationFn: async () => {
			if (!wallet) {
				throw new Error("No wallet available for logout");
			}

			const address = wallet.account.address;
			clearSessionSeed(address);
			session.setThirdwebAuthToken(null);

			queryClient.removeQueries({
				queryKey: rpcQuery.users.profile.me.key(),
			});
			queryClient.removeQueries({
				queryKey: filosignKeys.keyRegistrySnapshot(address),
			});
			queryClient.removeQueries({
				queryKey: filosignKeys.authedApi(address),
			});
			queryClient.removeQueries({
				queryKey: filosignKeys.cryptoUnlocked(address),
			});
			queryClient.removeQueries({
				queryKey: ["platform-access-preview"],
			});

			await queryClient.invalidateQueries();
		},
	});
}
