import {
	type Abi,
	type Account,
	type Client,
	createPublicClient,
	type GetContractReturnType,
	getContract,
	type PublicClient,
	type Transport,
	type Chain as ViemChain,
	type WalletClient,
} from "viem";
import { base, baseSepolia, hardhat } from "viem/chains";
import {
	attachmentReleaseAbi,
	envelopeRegistryAbi,
	type FSAttachmentReleaseAbi,
	type FSEnvelopeRegistryAbi,
	type FSPaymentValidatorAbi,
	paymentValidatorAbi,
} from "../definitions/generated/abi-types.js";
import {
	type ChainDefinitionsEntry,
	type ChainKey,
	getDefinitionsEntry,
	toViemAbi,
} from "../definitions/index";

export type {
	FSAttachmentReleaseAbi,
	FSEnvelopeRegistryAbi,
	FSPaymentValidatorAbi,
} from "../definitions/generated/abi-types.js";
export type { ChainDefinitionsEntry, ChainKey } from "../definitions/index";

export type FilosignContractName = keyof ChainDefinitionsEntry & string;

export function getContractAbi(
	name: FilosignContractName,
	chainKey: ChainKey = "local",
): Abi {
	if (name === "FSEnvelopeRegistry") return envelopeRegistryAbi;
	if (name === "FSPaymentValidator") return paymentValidatorAbi;
	if (name === "FSAttachmentRelease") return attachmentReleaseAbi;

	const entry = getDefinitionsEntry(chainKey);
	const contract = entry[name as keyof ChainDefinitionsEntry];
	if (!contract || typeof contract !== "object" || !("abi" in contract)) {
		throw new Error(`${name} not in definitions for ${chainKey}`);
	}
	return toViemAbi(contract.abi);
}

const VIEM_CHAIN_BY_KEY = {
	local: hardhat,
	testnet: baseSepolia,
	mainnet: base,
} as const satisfies Record<ChainKey, ViemChain>;

type Wallet = WalletClient<Transport, ViemChain, Account>;

type FilosignKeyedContractClient = {
	public: PublicClient<Transport, ViemChain>;
	wallet: WalletClient<Transport, ViemChain, Account>;
};

type CoreFilosignContracts<_T extends Wallet> = {
	FSEnvelopeRegistry: GetContractReturnType<
		FSEnvelopeRegistryAbi,
		FilosignKeyedContractClient,
		ChainDefinitionsEntry["FSEnvelopeRegistry"]["address"]
	>;
	FSPaymentValidator: GetContractReturnType<
		FSPaymentValidatorAbi,
		FilosignKeyedContractClient,
		ChainDefinitionsEntry["FSPaymentValidator"]["address"]
	>;
};

type AttachmentReleaseDefinition = Exclude<
	ChainDefinitionsEntry["FSAttachmentRelease"],
	undefined
>;

type OptionalAttachmentReleaseContract<_T extends Wallet> =
	AttachmentReleaseDefinition extends never
		? Record<string, never>
		: {
				FSAttachmentRelease?: GetContractReturnType<
					FSAttachmentReleaseAbi,
					FilosignKeyedContractClient,
					AttachmentReleaseDefinition["address"]
				>;
			};

export type FilosignContracts<T extends Wallet = Wallet> =
	CoreFilosignContracts<T> &
		OptionalAttachmentReleaseContract<T> & {
			$client: T;
			$chainKey: ChainKey;
		};

function getKeyedClient<T extends Client | WalletClient>(
	client: T,
	chainKey: ChainKey,
) {
	const chain = VIEM_CHAIN_BY_KEY[chainKey];
	return {
		public: createPublicClient({
			chain,
			transport: () => ({
				config: (client as Client).transport,
				request: (client as Client).request,
			}),
		}),
		wallet: client,
	} as FilosignKeyedContractClient;
}

export function getContracts<T extends Wallet>(options: {
	client: T;
	chainKey: ChainKey;
}): FilosignContracts<T> {
	const { client, chainKey } = options;
	const contractDefinitions = getDefinitionsEntry(chainKey);
	const bundledClient = getKeyedClient(client, chainKey);
	const attachmentRelease = contractDefinitions.FSAttachmentRelease;

	return {
		FSEnvelopeRegistry: getContract({
			client: bundledClient,
			address: contractDefinitions.FSEnvelopeRegistry.address,
			abi: envelopeRegistryAbi,
		}),
		FSPaymentValidator: getContract({
			client: bundledClient,
			address: contractDefinitions.FSPaymentValidator.address,
			abi: paymentValidatorAbi,
		}),
		...(attachmentRelease
			? {
					FSAttachmentRelease: getContract({
						client: bundledClient,
						address: attachmentRelease.address,
						abi: attachmentReleaseAbi,
					}),
				}
			: {}),
		$client: client,
		$chainKey: chainKey,
	} as FilosignContracts<T>;
}
