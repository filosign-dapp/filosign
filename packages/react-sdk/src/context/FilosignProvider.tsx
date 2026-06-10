import type { signatures } from "@filosign/crypto-utils";
import { type FilosignContracts, getContracts } from "@filosign/evm";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { MINUTE } from "../constants";
import type { FilosignWallet } from "../lib/wallet";
import {
	createFilosignOrpcClient,
	FilosignSession,
	normalizeApiBaseUrl,
} from "../orpc/create-orpc-client";
import { createFilosignRpcQueryUtils } from "../orpc/rpc-query-utils";
import {
	FilosignContext,
	type FilosignContextValue,
	type Runtime,
} from "./FilosignContext";

type Wallet = FilosignWallet | undefined;
type DilithiumInstance = Parameters<typeof signatures.keyGen>[0]["dl"];

type FilosignConfig = {
	children: ReactNode;
	apiBaseUrl: string;
	wallet: Wallet | undefined;
	/** thirdweb embedded-wallet auth token (`useAuthToken()`). */
	thirdwebAuthToken?: string | null;
	wasm: {
		dilithium?: DilithiumInstance;
	};
	loader?: React.ComponentType<{ text?: string }>;
};

export function FilosignProvider(props: FilosignConfig) {
	const {
		children,
		apiBaseUrl,
		wallet,
		thirdwebAuthToken = null,
		wasm,
	} = props;

	const [contracts, setContracts] = useState<FilosignContracts | null>(null);

	const apiBaseNormalized = normalizeApiBaseUrl(apiBaseUrl);
	const sessionRef = useRef<FilosignSession | null>(null);
	if (!sessionRef.current) {
		sessionRef.current = new FilosignSession();
	}
	const session = sessionRef.current;

	const rpc = useMemo(
		() => createFilosignOrpcClient(apiBaseNormalized, session),
		[apiBaseNormalized, session],
	);

	const rpcQuery = useMemo(() => createFilosignRpcQueryUtils(rpc), [rpc]);

	const runtimeQuery = useQuery({
		...rpcQuery.runtime.queryOptions(),
		staleTime: 5 * MINUTE,
		queryFn: async () => {
			const data = await rpc.runtime();
			if (!data?.chainKey) throw new Error("Failed to fetch runtime");
			return data;
		},
	});

	const walletAddress = wallet?.account.address;
	const chainKey = runtimeQuery.data?.chainKey;

	useEffect(() => {
		session.bindWallet(walletAddress);
	}, [session, walletAddress]);

	useEffect(() => {
		session.setThirdwebAuthToken(thirdwebAuthToken);
	}, [session, thirdwebAuthToken]);

	useEffect(() => {
		if (!chainKey) {
			setContracts(null);
			return;
		}
		if (!walletAddress) {
			setContracts(null);
			return;
		}
		// Keep contracts when `wallet` client is briefly undefined during connect.
		if (!wallet) {
			return;
		}

		setContracts(
			getContracts({
				client: wallet,
				chainKey,
			}),
		);
	}, [chainKey, walletAddress, wallet]);

	const value: FilosignContextValue = useMemo(
		() => ({
			ready: !!runtimeQuery.data,
			apiBaseUrl: apiBaseNormalized,
			rpc,
			rpcQuery,
			session,
			thirdwebAuthToken: thirdwebAuthToken?.trim()
				? thirdwebAuthToken.trim()
				: null,
			wallet: wallet,
			contracts,
			wasm: { dilithium: wasm.dilithium },
			runtime: runtimeQuery.data || ({} as Runtime),
		}),
		[
			apiBaseNormalized,
			rpc,
			rpcQuery,
			session,
			thirdwebAuthToken,
			wallet,
			contracts,
			wasm,
			runtimeQuery.data,
		],
	);

	return (
		<FilosignContext.Provider value={value}>
			{children}
		</FilosignContext.Provider>
	);
}
