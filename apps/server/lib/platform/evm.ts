import { getContracts, getHistoricalAbi } from "@filosign/evm";
import { type Address, getAddress, getContract, type Hex } from "viem";
import config from "@/config";
import { writePieceRelayerPin } from "@/lib/domains/files/utils/relayer-pin";
import {
	createServerChainRpcTransport,
	serverChainRpcTransportArgs,
} from "@/lib/platform/chain-rpc";
import { relayContractWrite } from "@/lib/platform/evm/contract-write";
import { withRegistryWalletLock } from "@/lib/platform/evm/registry-wallet-lock";
import { withRelayerPoolFailover } from "@/lib/platform/evm/relay-failover";
import {
	createRelayReceiptWaiter,
	relayWrite,
} from "@/lib/platform/evm/relay-write";
import { withRelayerLock } from "@/lib/platform/evm/relayer-lock";
import {
	fsContractsForRelayer,
	getRelayerWalletClient,
	parseRelayerPool,
	routeRelayerForPiece,
} from "@/lib/platform/evm/relayer-pool";

const chainRpcArgs = serverChainRpcTransportArgs();
const { summary: chainRpcSummary } =
	createServerChainRpcTransport(chainRpcArgs);

console.log("chain rpc:", {
	httpUrl: chainRpcSummary.httpUrl,
	dedicatedPrimary: chainRpcSummary.dedicatedPrimary,
	publicFallback: chainRpcSummary.fallbackEnabled
		? chainRpcSummary.publicFallbackUrl
		: undefined,
});

export const evmClient = getRelayerWalletClient(parseRelayerPool()[0].address);

export const fsContracts = getContracts({
	client: evmClient,
	chainKey: config.chainKey,
});

export const waitForRelayReceipt = createRelayReceiptWaiter(evmClient);

const keyedClient = { public: evmClient, wallet: evmClient } as const;

export {
	isRelayerRelayRetryable,
	RelayerRelayFailoverError,
	signalRelayerRelayFailover,
	withRelayerPoolFailover,
} from "@/lib/platform/evm/relay-failover";

export {
	fsContractsForRelayer,
	getRelayerWalletClient,
	parseRelayerPool,
	relayerPoolAddresses,
	routeRelayerForNewPiece,
	routeRelayerForOrg,
	routeRelayerForPiece,
} from "@/lib/platform/evm/relayer-pool";

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

export function fsPaymentValidatorForRelayer(
	validatorAddress: Address,
	relayerAddress: Address,
) {
	const relayerClient = getRelayerWalletClient(relayerAddress);
	const relayerKeyedClient = {
		public: relayerClient,
		wallet: relayerClient,
	} as const;
	const base = fsContracts.FSPaymentValidator;
	const resolvedAddress = getAddress(validatorAddress);
	const historicalAbi = getHistoricalAbi(
		"FSPaymentValidator",
		resolvedAddress,
		config.chainKey,
	);
	return getContract({
		address: resolvedAddress,
		abi:
			(historicalAbi as typeof fsContracts.FSPaymentValidator.abi) ?? base.abi,
		client: relayerKeyedClient,
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
	relayerAddress: Address,
): EnvelopeRegistryRelayWrite {
	const contracts = fsContractsForRelayer(relayerAddress);
	const bound =
		registry.address.toLowerCase() ===
		contracts.FSEnvelopeRegistry.address.toLowerCase()
			? contracts.FSEnvelopeRegistry
			: registry;
	return relayContractWrite<EnvelopeRegistryRelayWrite>(bound.write);
}

async function relayPieceScopedRegistryWrite(args: {
	pieceCid: string;
	pinnedRelayerAddress: Address | null | undefined;
	registry: EnvelopeRegistryContract;
	walletLockAddress: Address;
	step: string;
	write: (relay: EnvelopeRegistryRelayWrite) => Promise<`0x${string}`>;
}): Promise<`0x${string}`> {
	const primary = routeRelayerForPiece({
		pieceCid: args.pieceCid,
		pinnedRelayerAddress: args.pinnedRelayerAddress,
	});

	const failover = await withRelayerPoolFailover({
		primary,
		step: args.step,
		context: { pieceCid: args.pieceCid },
		run: async (member) => {
			const waitForReceipt = createRelayReceiptWaiter(
				getRelayerWalletClient(member.address),
			);
			return withRelayerLock(member.address, () =>
				withRegistryWalletLock(args.walletLockAddress, () =>
					relayWrite({
						step: args.step,
						write: () =>
							args.write(
								envelopeRegistryRelayWrite(args.registry, member.address),
							),
						waitForReceipt,
					}),
				),
			);
		},
	});

	await writePieceRelayerPin(args.pieceCid, failover.relayer.address).catch(
		() => undefined,
	);

	return failover.result;
}

/** Relay server-signed registry writes when viem contract typings omit methods. */
export async function relayRegisterEnvelopeAck(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
	pieceScoped: { pieceCid: string; pinnedRelayerAddress?: Address | null },
): Promise<`0x${string}`> {
	const viewerWallet = getAddress(args[2] as `0x${string}`);
	return relayPieceScopedRegistryWrite({
		pieceCid: pieceScoped.pieceCid,
		pinnedRelayerAddress: pieceScoped.pinnedRelayerAddress,
		registry,
		walletLockAddress: viewerWallet,
		step: "registerEnvelopeAck",
		write: (relay) => relay.registerEnvelopeAck(args),
	});
}

export async function relayRegisterEnvelopeSignature(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
	pieceScoped: { pieceCid: string; pinnedRelayerAddress?: Address | null },
): Promise<`0x${string}`> {
	const signerWallet = getAddress(args[2] as `0x${string}`);
	return relayPieceScopedRegistryWrite({
		pieceCid: pieceScoped.pieceCid,
		pinnedRelayerAddress: pieceScoped.pinnedRelayerAddress,
		registry,
		walletLockAddress: signerWallet,
		step: "registerEnvelopeSignature",
		write: (relay) => relay.registerEnvelopeSignature(args),
	});
}

export async function relayProposeSignerReplacement(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
	pieceScoped: { pieceCid: string; pinnedRelayerAddress?: Address | null },
): Promise<`0x${string}`> {
	const recaller = getAddress(args[1] as `0x${string}`);
	return relayPieceScopedRegistryWrite({
		pieceCid: pieceScoped.pieceCid,
		pinnedRelayerAddress: pieceScoped.pinnedRelayerAddress,
		registry,
		walletLockAddress: recaller,
		step: "proposeSignerReplacement",
		write: (relay) => relay.proposeSignerReplacement(args),
	});
}

export async function relayExecuteSignerReplacement(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
	pieceScoped: { pieceCid: string; pinnedRelayerAddress?: Address | null },
): Promise<`0x${string}`> {
	const recaller = getAddress(args[1] as `0x${string}`);
	return relayPieceScopedRegistryWrite({
		pieceCid: pieceScoped.pieceCid,
		pinnedRelayerAddress: pieceScoped.pinnedRelayerAddress,
		registry,
		walletLockAddress: recaller,
		step: "executeSignerReplacement",
		write: (relay) => relay.executeSignerReplacement(args),
	});
}

export async function relayCancelSignerReplacement(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
	pieceScoped: { pieceCid: string; pinnedRelayerAddress?: Address | null },
): Promise<`0x${string}`> {
	const recaller = getAddress(args[1] as `0x${string}`);
	return relayPieceScopedRegistryWrite({
		pieceCid: pieceScoped.pieceCid,
		pinnedRelayerAddress: pieceScoped.pinnedRelayerAddress,
		registry,
		walletLockAddress: recaller,
		step: "cancelSignerReplacement",
		write: (relay) => relay.cancelSignerReplacement(args),
	});
}

export async function relayRecallEnvelope(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
	pieceScoped: { pieceCid: string; pinnedRelayerAddress?: Address | null },
): Promise<`0x${string}`> {
	const recaller = getAddress(args[1] as `0x${string}`);
	return relayPieceScopedRegistryWrite({
		pieceCid: pieceScoped.pieceCid,
		pinnedRelayerAddress: pieceScoped.pinnedRelayerAddress,
		registry,
		walletLockAddress: recaller,
		step: "recallEnvelope",
		write: (relay) => relay.recallEnvelope(args),
	});
}

export async function relayClearEnvelopeSignatures(
	registry: EnvelopeRegistryContract,
	args: readonly unknown[],
	pieceScoped: { pieceCid: string; pinnedRelayerAddress?: Address | null },
): Promise<`0x${string}`> {
	const recaller = getAddress(args[1] as `0x${string}`);
	return relayPieceScopedRegistryWrite({
		pieceCid: pieceScoped.pieceCid,
		pinnedRelayerAddress: pieceScoped.pinnedRelayerAddress,
		registry,
		walletLockAddress: recaller,
		step: "clearEnvelopeSignatures",
		write: (relay) => relay.clearEnvelopeSignatures(args),
	});
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
