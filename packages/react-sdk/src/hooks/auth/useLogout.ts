import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { filosignKeys } from "../../lib/query-keys";
import { clearSessionSeed } from "./session-seed";

export function useLogout() {
	const { wallet, session } = useFilosignContext();
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

			queryClient.invalidateQueries({
				queryKey: filosignKeys.authedApi(address),
			});
			queryClient.invalidateQueries({
				queryKey: filosignKeys.cryptoUnlocked(address),
			});
			queryClient.invalidateQueries();
			queryClient.refetchQueries();
		},
	});
}
