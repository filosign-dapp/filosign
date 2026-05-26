import {
	type Abi,
	type Account,
	type Address,
	type Client,
	createPublicClient,
	type GetContractReturnType,
	getContract,
	http,
	type PublicClient,
	type Transport,
	type Chain as ViemChain,
	type WalletClient,
} from "viem";
import { base, baseSepolia, hardhat } from "viem/chains";
import {
	type ChainDefinitionsEntry,
	type ChainKey,
	getDefinitionsEntry,
} from "../definitions/index";

export type { ChainKey } from "../definitions/index";

export type FilosignContractName = keyof ChainDefinitionsEntry & string;

export function getContractAbi(
	name: FilosignContractName,
	chainKey: ChainKey = "local",
): Abi {
	const entry = getDefinitionsEntry(chainKey);
	const contract = entry[name as keyof ChainDefinitionsEntry];
	if (!contract || typeof contract !== "object" || !("abi" in contract)) {
		throw new Error(`${name} not in definitions for ${chainKey}`);
	}
	return contract.abi as Abi;
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

type CoreDefinitionContracts = Pick<
	ChainDefinitionsEntry,
	"FSFileRegistry" | "FSPaymentValidator"
>;

export type FilosignContracts<T extends Wallet = Wallet> = {
	[K in keyof CoreDefinitionContracts]: GetContractReturnType<
		CoreDefinitionContracts[K]["abi"],
		FilosignKeyedContractClient,
		CoreDefinitionContracts[K]["address"] extends Address
			? CoreDefinitionContracts[K]["address"]
			: Address
	>;
} & {
	$client: T;
};

function getKeyedClient<T extends Client | WalletClient>(
	client: T,
	chainKey: ChainKey,
) {
	const chain = VIEM_CHAIN_BY_KEY[chainKey];
	return {
		public: createPublicClient({ chain, transport: http() }),
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

	return {
		FSFileRegistry: getContract({
			client: bundledClient,
			...contractDefinitions.FSFileRegistry,
		}),
		FSPaymentValidator: getContract({
			client: bundledClient,
			...contractDefinitions.FSPaymentValidator,
		}),
		$client: client,
	};
}
