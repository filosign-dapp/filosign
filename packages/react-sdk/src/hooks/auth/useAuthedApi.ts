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
export function useAuthedApi() {
	const { rpc, rpcQuery, session, wallet, wasm } = useFilosignContext();
	const { action: cryptoAction } = useCryptoSeed();
	const walletAddress = wallet?.account.address;

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

			try {
				const refreshed = await rpc.auth.refresh();
				if (refreshed.token) {
					session.setJwt(refreshed.token, walletAddress);
					return { rpc, session };
				}
			} catch {
				// fall through to dilithium bootstrap
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
		enabled: !!wallet && !!wasm.dilithium,
	});
}
