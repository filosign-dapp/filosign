import { getContracts } from "@filosign/contracts";
import {
	createWalletClient,
	getAddress,
	getContract,
	type http,
	publicActions,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import config from "@/config";
import env from "@/env";
import {
	createServerChainRpcTransport,
	serverChainRpcTransportArgs,
} from "@/lib/platform/chain-rpc";
import { relayContractWrite } from "@/lib/platform/evm/contract-write";
import { withRegistryWalletLock } from "@/lib/platform/evm/registry-wallet-lock";
import { withRelayerLock } from "@/lib/platform/evm/relayer-lock";

const serverAccount = privateKeyToAccount(env.FC_SERVER_PRIVATE_KEY);

const chainRpcArgs = serverChainRpcTransportArgs();
const { transport: chainRpcTransport, summary: chainRpcSummary } =
	createServerChainRpcTransport(chainRpcArgs);

console.log("chain rpc:", {
	httpUrl: chainRpcSummary.httpUrl,
	dedicatedPrimary: chainRpcSummary.dedicatedPrimary,
	publicFallback: chainRpcSummary.fallbackEnabled
		? chainRpcSummary.publicFallbackUrl
		: undefined,
});

/** Cast keeps viem contract typings; runtime transport may be `fallback` in production. */
const evmTransport = chainRpcTransport as ReturnType<typeof http>;

export const evmClient = createWalletClient({
	chain: config.runtimeChain,
	transport: evmTransport,
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
	proposeSignerReplacement: (
		args: readonly unknown[],
	) => Promise<`0x${string}`>;
	executeSignerReplacement: (
		args: readonly unknown[],
	) => Promise<`0x${string}`>;
	cancelSignerReplacement: (args: readonly unknown[]) => Promise<`0x${string}`>;
	recallEnvelope: (args: readonly unknown[]) => Promise<`0x${string}`>;
};

function envelopeRegistryRelayWrite(
	registry: EnvelopeRegistryContract,
): EnvelopeRegistryRelayWrite {
	return relayContractWrite<EnvelopeRegistryRelayWrite>(registry.write);
}

/** Relay server-signed registry writes when viem contract typings omit methods. */
export async function relayRegisterEnvelopeSignature(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
): Promise<`0x${string}`> {
	const signerWallet = getAddress(args[2] as `0x${string}`);
	return withRelayerLock(() =>
		withRegistryWalletLock(signerWallet, () =>
			envelopeRegistryRelayWrite(registry).registerEnvelopeSignature(args),
		),
	);
}

export async function relayProposeSignerReplacement(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
): Promise<`0x${string}`> {
	const recaller = getAddress(args[1] as `0x${string}`);
	return withRelayerLock(() =>
		withRegistryWalletLock(recaller, () =>
			envelopeRegistryRelayWrite(registry).proposeSignerReplacement(args),
		),
	);
}

export async function relayExecuteSignerReplacement(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
): Promise<`0x${string}`> {
	const recaller = getAddress(args[1] as `0x${string}`);
	return withRelayerLock(() =>
		withRegistryWalletLock(recaller, () =>
			envelopeRegistryRelayWrite(registry).executeSignerReplacement(args),
		),
	);
}

export async function relayCancelSignerReplacement(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
): Promise<`0x${string}`> {
	const recaller = getAddress(args[1] as `0x${string}`);
	return withRelayerLock(() =>
		withRegistryWalletLock(recaller, () =>
			envelopeRegistryRelayWrite(registry).cancelSignerReplacement(args),
		),
	);
}

export async function relayRecallEnvelope(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
): Promise<`0x${string}`> {
	const recaller = getAddress(args[1] as `0x${string}`);
	return withRelayerLock(() =>
		withRegistryWalletLock(recaller, () =>
			envelopeRegistryRelayWrite(registry).recallEnvelope(args),
		),
	);
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
