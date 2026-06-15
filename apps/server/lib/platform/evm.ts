import { getContracts, getHistoricalAbi } from "@filosign/evm";
import {
	type Address,
	createWalletClient,
	getAddress,
	getContract,
	type Hex,
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
import {
	createRelayReceiptWaiter,
	relayWrite,
} from "@/lib/platform/evm/relay-write";
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
const evmTransport = chainRpcTransport;

export const evmClient = createWalletClient({
	chain: config.runtimeChain,
	transport: evmTransport,
	account: serverAccount,
}).extend(publicActions);

export const fsContracts = getContracts({
	client: evmClient,
	chainKey: config.chainKey,
});

const waitForRelayReceipt = createRelayReceiptWaiter(evmClient);

const keyedClient = { public: evmClient, wallet: evmClient } as const;

export function fsEnvelopeRegistryAt(address?: string | null) {
	if (!address) return fsContracts.FSEnvelopeRegistry;
	const resolvedAddress = getAddress(address);
	const historicalAbi = getHistoricalAbi(
		"FSEnvelopeRegistry",
		resolvedAddress,
		config.chainKey,
	);
	return getContract({
		address: resolvedAddress,
		abi:
			(historicalAbi as typeof fsContracts.FSEnvelopeRegistry.abi) ??
			fsContracts.FSEnvelopeRegistry.abi,
		client: keyedClient,
	});
}

export function fsPaymentValidatorAt(address?: string | null) {
	if (!address) return fsContracts.FSPaymentValidator;
	const resolvedAddress = getAddress(address);
	const historicalAbi = getHistoricalAbi(
		"FSPaymentValidator",
		resolvedAddress,
		config.chainKey,
	);
	return getContract({
		address: resolvedAddress,
		abi:
			(historicalAbi as typeof fsContracts.FSPaymentValidator.abi) ??
			fsContracts.FSPaymentValidator.abi,
		client: keyedClient,
	});
}

type EnvelopeRegistryContract = ReturnType<typeof fsEnvelopeRegistryAt>;

type EnvelopeRegistryRelayWrite = {
	registerEnvelopeAck: (args: readonly unknown[]) => Promise<`0x${string}`>;
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
	clearEnvelopeSignatures: (args: readonly unknown[]) => Promise<`0x${string}`>;
};

function envelopeRegistryRelayWrite(
	registry: EnvelopeRegistryContract,
): EnvelopeRegistryRelayWrite {
	return relayContractWrite<EnvelopeRegistryRelayWrite>(registry.write);
}

/** Relay server-signed registry writes when viem contract typings omit methods. */
export async function relayRegisterEnvelopeAck(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
): Promise<`0x${string}`> {
	const viewerWallet = getAddress(args[2] as `0x${string}`);
	return withRelayerLock(() =>
		withRegistryWalletLock(viewerWallet, () =>
			relayWrite({
				step: "registerEnvelopeAck",
				write: () =>
					envelopeRegistryRelayWrite(registry).registerEnvelopeAck(args),
				waitForReceipt: waitForRelayReceipt,
			}),
		),
	);
}

export async function relayRegisterEnvelopeSignature(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
): Promise<`0x${string}`> {
	const signerWallet = getAddress(args[2] as `0x${string}`);
	return withRelayerLock(() =>
		withRegistryWalletLock(signerWallet, () =>
			relayWrite({
				step: "registerEnvelopeSignature",
				write: () =>
					envelopeRegistryRelayWrite(registry).registerEnvelopeSignature(args),
				waitForReceipt: waitForRelayReceipt,
			}),
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
			relayWrite({
				step: "proposeSignerReplacement",
				write: () =>
					envelopeRegistryRelayWrite(registry).proposeSignerReplacement(args),
				waitForReceipt: waitForRelayReceipt,
			}),
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
			relayWrite({
				step: "executeSignerReplacement",
				write: () =>
					envelopeRegistryRelayWrite(registry).executeSignerReplacement(args),
				waitForReceipt: waitForRelayReceipt,
			}),
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
			relayWrite({
				step: "cancelSignerReplacement",
				write: () =>
					envelopeRegistryRelayWrite(registry).cancelSignerReplacement(args),
				waitForReceipt: waitForRelayReceipt,
			}),
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
			relayWrite({
				step: "recallEnvelope",
				write: () => envelopeRegistryRelayWrite(registry).recallEnvelope(args),
				waitForReceipt: waitForRelayReceipt,
			}),
		),
	);
}

export async function relayClearEnvelopeSignatures(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
): Promise<`0x${string}`> {
	const recaller = getAddress(args[1] as `0x${string}`);
	return withRelayerLock(() =>
		withRegistryWalletLock(recaller, () =>
			relayWrite({
				step: "clearEnvelopeSignatures",
				write: () =>
					envelopeRegistryRelayWrite(registry).clearEnvelopeSignatures(args),
				waitForReceipt: waitForRelayReceipt,
			}),
		),
	);
}

const registryPaymentValidatorAbi = [
	{
		type: "function",
		name: "paymentValidator",
		stateMutability: "view",
		inputs: [],
		outputs: [{ type: "address" }],
	},
] as const;

const paymentValidatorHasPaidLegAbi = [
	{
		type: "function",
		name: "hasAnyPaidLegForCid",
		stateMutability: "view",
		inputs: [{ name: "cidId_", type: "bytes32" }],
		outputs: [{ type: "bool" }],
	},
] as const;

export async function readRegistryPaymentValidatorAddress(
	registryAddress: Address,
): Promise<Address> {
	return evmClient.readContract({
		address: registryAddress,
		abi: registryPaymentValidatorAbi,
		functionName: "paymentValidator",
	});
}

export async function readHasAnyPaidLegForCid(
	validatorAddress: Address,
	cidId: Hex,
): Promise<boolean> {
	return evmClient.readContract({
		address: validatorAddress,
		abi: paymentValidatorHasPaidLegAbi,
		functionName: "hasAnyPaidLegForCid",
		args: [cidId],
	});
}

export function fsAttachmentReleaseAt(address?: string | null) {
	const base = fsContracts.FSAttachmentRelease;
	if (!base) return null;
	if (!address) return base;
	const resolved = getAddress(address);
	if (resolved.toLowerCase() === base.address.toLowerCase()) return base;
	const historicalAbi = getHistoricalAbi(
		"FSAttachmentRelease",
		resolved,
		config.chainKey,
	);
	return getContract({
		address: resolved,
		abi: (historicalAbi as typeof base.abi) ?? base.abi,
		client: keyedClient,
	});
}
