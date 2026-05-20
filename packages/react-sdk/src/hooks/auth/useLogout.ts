import { writeStoredAccessJwt } from "@filosign/auth/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { filosignKeys } from "../../lib/query-keys";
import { clearSessionSeed } from "./session-seed";

export function useLogout() {
	const { wallet, session, rpc } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ["fsM-logout"],
		mutationFn: async () => {
			if (!wallet) {
				throw new Error("No wallet available for logout");
			}

			const address = wallet.account.address;
			try {
				await rpc.auth.logout();
			} catch {
				// still clear local state if server unreachable
			}

			clearSessionSeed(address);
			session.setJwt(null, address);
			writeStoredAccessJwt(address, null);

			queryClient.invalidateQueries({
				queryKey: filosignKeys.isLoggedIn(address),
			});
			queryClient.invalidateQueries();
			queryClient.refetchQueries();
		},
	});
}
