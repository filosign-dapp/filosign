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

type FileRegistryContract = ReturnType<typeof fsFileRegistryAt>;

type FileRegistryRelayWrite = {
	registerFileSignature: (args: readonly unknown[]) => Promise<`0x${string}`>;
	amendSigner: (args: readonly unknown[]) => Promise<`0x${string}`>;
};

function fileRegistryRelayWrite(
	registry: FileRegistryContract,
): FileRegistryRelayWrite {
	return registry.write as unknown as FileRegistryRelayWrite;
}

/** Relay server-signed registry writes when viem contract typings omit methods. */
export async function relayRegisterFileSignature(
	registry: FileRegistryContract,
	args: readonly unknown[],
): Promise<`0x${string}`> {
	return fileRegistryRelayWrite(registry).registerFileSignature(args);
}

export async function relayAmendSigner(
	registry: FileRegistryContract,
	args: readonly unknown[],
): Promise<`0x${string}`> {
	return fileRegistryRelayWrite(registry).amendSigner(args);
}

export function fsAttachmentReleaseAt(address?: string | null) {
	const base = fsContracts.FSAttachmentRelease;
	if (!base) return null;
	if (!address) return base;
	const resolved = getAddress(address);
	if (resolved.toLowerCase() === base.address.toLowerCase()) return base;
	return getContract({
		address: resolved,
		abi: base.abi,
		client: keyedClient,
	});
}
