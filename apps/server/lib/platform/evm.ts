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

export function fsEnvelopeRegistryAt(address?: string | null) {
	if (!address) return fsContracts.FSEnvelopeRegistry;
	return getContract({
		address: getAddress(address),
		abi: fsContracts.FSEnvelopeRegistry.abi,
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

type EnvelopeRegistryContract = ReturnType<typeof fsEnvelopeRegistryAt>;

type EnvelopeRegistryRelayWrite = {
	registerEnvelopeSignature: (
		args: readonly unknown[],
	) => Promise<`0x${string}`>;
	amendSigner: (args: readonly unknown[]) => Promise<`0x${string}`>;
};

function envelopeRegistryRelayWrite(
	registry: EnvelopeRegistryContract,
): EnvelopeRegistryRelayWrite {
	return registry.write as unknown as EnvelopeRegistryRelayWrite;
}

/** Relay server-signed registry writes when viem contract typings omit methods. */
export async function relayRegisterEnvelopeSignature(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
): Promise<`0x${string}`> {
	return envelopeRegistryRelayWrite(registry).registerEnvelopeSignature(args);
}

export async function relayAmendSigner(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
): Promise<`0x${string}`> {
	return envelopeRegistryRelayWrite(registry).amendSigner(args);
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
