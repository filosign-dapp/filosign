import { readStoredAccessJwt } from "@filosign/auth/client";
import { signatures, toBytes, toHex } from "@filosign/crypto-utils";
import { useQuery } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { filosignKeys } from "../../lib/query-keys";
import type { AppRouterClient } from "../../orpc/app-router-types";
import type { FilosignSession } from "../../orpc/create-orpc-client";
import { useCryptoSeed } from "./useCryptoSeed";

export type FilosignAuthed = {
	rpc: AppRouterClient;
	session: FilosignSession;
};

/**
 * Ensures a JWT is on the shared oRPC client before authenticated procedures run.
 * Order: valid access JWT → refresh cookie → dilithium `auth.nonce` / `auth.verify`.
 */
export type UseAuthedApiOptions = {
	/** When false, skips the JWT bootstrap query (no refresh / dilithium). Default true. */
	enabled?: boolean;
};

export function useAuthedApi(options?: UseAuthedApiOptions) {
	const { rpc, rpcQuery, session, wallet, wasm } = useFilosignContext();
	const { action: cryptoAction } = useCryptoSeed();
	const walletAddress = wallet?.account.address;
	const authEnabled = options?.enabled ?? true;

	return useQuery({
		queryKey: filosignKeys.authedApi(walletAddress),
		queryFn: async (): Promise<FilosignAuthed> => {
			if (!wallet || !walletAddress) {
				throw new Error("unreachable");
			}

			session.bindWallet(walletAddress);

			if (session.hasValidAccessJwt(walletAddress)) {
				return { rpc, session };
			}

			// Only hit refresh when we previously had an access JWT (expired or stale).
			// Avoids noisy 401s for guests with a connected wallet but no Filosign session.
			if (readStoredAccessJwt(walletAddress)) {
				try {
					const refreshed = await rpc.auth.refresh();
					if (refreshed.token) {
						session.setJwt(refreshed.token, walletAddress);
						return { rpc, session };
					}
				} catch {
					// fall through to dilithium bootstrap
				}
			}

			await cryptoAction(async (seed: Uint8Array) => {
				const { nonce } = await rpcQuery.auth.nonce.call({
					address: walletAddress,
				});

				const dl3Keypair = await signatures.keyGen({
					dl: wasm.dilithium,
					seed,
				});

				const signature = await signatures.sign({
					dl: wasm.dilithium,
					privateKey: dl3Keypair.privateKey,
					message: toBytes(nonce),
				});

				const verify = await rpcQuery.auth.verify.call({
					address: walletAddress,
					signature: toHex(signature),
				});

				if (!verify.valid) {
					throw new Error("Authentication verification failed");
				}

				session.setJwt(verify.token, walletAddress);
			});

			session.ensureJwt();
			return { rpc, session };
		},
		enabled: authEnabled && !!wallet && !!wasm.dilithium,
		retry: false,
	});
}
