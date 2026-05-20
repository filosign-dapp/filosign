import { seedKeyGen } from "@filosign/crypto-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DAY } from "../../constants";
import { useFilosignContext } from "../../context/useFilosignContext";
import { filosignKeys } from "../../lib/query-keys";
import type { KeyRegistrySnapshot } from "./key-registry-snapshot";
import { getSessionSeed } from "./session-seed";
import { useKeyRegistrySnapshot } from "./useKeyRegistrySnapshot";

export function useIsLoggedIn() {
	const { wallet, contracts, wasm } = useFilosignContext();
	const queryClient = useQueryClient();
	const snapshot = useKeyRegistrySnapshot();
	const address = wallet?.account.address;
	const hasSessionSeed = address ? Boolean(getSessionSeed(address)) : false;

	return useQuery({
		queryKey: filosignKeys.isLoggedIn(address),
		queryFn: async () => {
			if (!wallet || !contracts || !wasm.dilithium || !address) {
				return false;
			}
			const cached = queryClient.getQueryData<KeyRegistrySnapshot>(
				filosignKeys.keyRegistrySnapshot(address),
			);
			const { isRegistered, storedKeygenData } = cached ?? {};
			if (!isRegistered || !storedKeygenData) {
				return false;
			}

			const keySeed = getSessionSeed(wallet.account.address);
			if (!keySeed) {
				return false;
			}

			const keygenData = await seedKeyGen(keySeed, { dl: wasm.dilithium });
			const { commitmentKem, commitmentSig } = storedKeygenData;

			return (
				commitmentKem === keygenData.commitmentKem &&
				commitmentSig === keygenData.commitmentSig
			);
		},
		staleTime: 1 * DAY,
		enabled:
			!!wallet &&
			!!contracts &&
			!!wasm.dilithium &&
			snapshot.isSuccess &&
			hasSessionSeed,
	});
}
