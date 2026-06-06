import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { invalidateUserProfile } from "../../lib/invalidate-user-profile";
import type { LoginParams } from "../../lib/login/login";
import { performLogin } from "../../lib/login/login";
import { filosignKeys } from "../../lib/query-keys";
import {
	invalidateAuthQueries,
	invalidateSessionQueries,
} from "./invalidate-auth-queries";
import type { KeyRegistrySnapshot } from "./key-registry-snapshot";
import { useCryptoUnlocked } from "./useCryptoUnlocked";
import { useIsRegistered } from "./useIsRegistered";

export {
	LOGIN_RECOVERY_PHRASE_REQUIRED,
	type LoginParams,
} from "../../lib/login/login";

export function useLogin() {
	const { rpcQuery, contracts, wallet, wasm } = useFilosignContext();
	const queryClient = useQueryClient();

	const { data: isRegistered } = useIsRegistered();
	const { data: isCryptoUnlocked } = useCryptoUnlocked();

	return useMutation({
		mutationFn: async (params: LoginParams) => {
			if (isCryptoUnlocked) return { success: true };

			if (!contracts || !wallet || !wasm.dilithium) {
				throw new Error("unreachable");
			}

			const address = wallet.account.address;
			const snapshot = queryClient.getQueryData<KeyRegistrySnapshot>(
				filosignKeys.keyRegistrySnapshot(address),
			);

			return performLogin(
				{
					contracts,
					wallet,
					wasm: { dilithium: wasm.dilithium },
					rpcQuery,
					queryClient,
					isRegistered,
					isCryptoUnlocked,
					storedKeygenData: snapshot?.storedKeygenData,
					invalidateAuthQueries,
					invalidateSessionQueries,
					invalidateUserProfile,
				},
				params,
			);
		},
	});
}
