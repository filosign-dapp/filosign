import type { ChainKey, FilosignContracts } from "@filosign/contracts";
import type { signatures } from "@filosign/crypto-utils";
import { createContext } from "react";
import type { FilosignWallet } from "../lib/wallet";
import type { AppRouterClient } from "../orpc/app-router-types";
import type { FilosignSession } from "../orpc/create-orpc-client";
import type { createFilosignRpcQueryUtils } from "../orpc/rpc-query-utils";

type Wallet = FilosignWallet | undefined;
type DilithiumInstance = Parameters<typeof signatures.keyGen>[0]["dl"];

export type FilosignRpcQueryUtils = ReturnType<
	typeof createFilosignRpcQueryUtils
>;

export type FilosignContextValue = {
	ready: boolean;
	apiBaseUrl: string;
	rpc: AppRouterClient;
	rpcQuery: FilosignRpcQueryUtils;
	session: FilosignSession;
	wallet: Wallet;
	contracts: FilosignContracts | null;
	runtime: Runtime;
	wasm: {
		dilithium: DilithiumInstance;
	};
};

export type Runtime = {
	uptime: number;
	chain: unknown;
	chainKey: ChainKey;
	serverAddressSynapse: string;
	treasury: string;
};

export const FilosignContext = createContext<FilosignContextValue>({
	ready: false,
	apiBaseUrl: "",
	rpc: {} as AppRouterClient,
	rpcQuery: {} as FilosignRpcQueryUtils,
	session: {} as FilosignSession,
	wallet: undefined,
	contracts: null,
	runtime: {} as Runtime,
	wasm: {
		dilithium: {} as DilithiumInstance,
	},
});
