import { getContracts } from "@filosign/contracts";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import config from "@/config";
import env from "@/env";

const serverAccount = privateKeyToAccount(env.FC_SERVER_PRIVATE_KEY);

export const evmClient = createWalletClient({
	chain: config.runtimeChain,
	transport: http(config.runtimeChain.rpcUrls.default.http[0]),
	account: serverAccount,
}).extend(publicActions);

export const fsContracts = getContracts({
	client: evmClient,
	chainKey: config.chainKey,
});
