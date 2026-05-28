import { getContracts } from "@filosign/contracts";
import {
	createWalletClient,
	getAddress,
	getContract,
	http,
	publicActions,
} from "viem";
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

const keyedClient = { public: evmClient, wallet: evmClient } as const;

export function fsFileRegistryAt(address?: string | null) {
	if (!address) return fsContracts.FSFileRegistry;
	return getContract({
		address: getAddress(address),
		abi: fsContracts.FSFileRegistry.abi,
		client: keyedClient,
	});
}

export function fsPaymentValidatorAt(address?: string | null) {
	if (!address) return fsContracts.FSPaymentValidator;
	return getContract({
		address: getAddress(address),
		abi: fsContracts.FSPaymentValidator.abi,
		client: keyedClient,
	});
}
