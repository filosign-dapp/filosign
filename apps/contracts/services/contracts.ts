import {
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

const VIEM_CHAIN_BY_KEY = {
	local: hardhat,
	testnet: baseSepolia,
	mainnet: base,
} as const satisfies Record<ChainKey, ViemChain>;

type Wallet = WalletClient<Transport, ViemChain, Account>;

/** Public + wallet client bundle passed to `getContract` (see `getKeyedClient`). */
type FilosignKeyedContractClient = {
	public: PublicClient<Transport, ViemChain>;
	wallet: WalletClient<Transport, ViemChain, Account>;
};

type DefinitionContracts = Pick<
	ChainDefinitionsEntry,
	"FSManager" | "FSFileRegistry" | "FSKeyRegistry"
>;

// Mapped type keeps TS7056 in check vs. a large inferred union.
export type FilosignContracts<T extends Wallet = Wallet> = {
	[K in keyof DefinitionContracts]: GetContractReturnType<
		DefinitionContracts[K]["abi"],
		FilosignKeyedContractClient,
		DefinitionContracts[K]["address"] extends Address
			? DefinitionContracts[K]["address"]
			: Address
	>;
} & {
	FSPaymentValidator?: GetContractReturnType<
		readonly unknown[],
		FilosignKeyedContractClient,
		Address
	>;
	$client: T;
};

/** Public reads use `chainKey` (server runtime), not wagmi's active chain (may be stale Hardhat). */
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

	if (!client.transport || !client.chain || !client.account) {
		console.log(
			"Ensure client is properly initialized with transport, chain and account",
		);
	}

	const contractDefinitions = getDefinitionsEntry(
		chainKey,
	) as ChainDefinitionsEntry & {
		FSPaymentValidator?: { address: Address; abi: readonly unknown[] };
	};
	const bundledClient = getKeyedClient(client, chainKey);

	const contracts = {
		FSManager: getContract({
			client: bundledClient,
			...contractDefinitions.FSManager,
		}),
		FSFileRegistry: getContract({
			client: bundledClient,
			...contractDefinitions.FSFileRegistry,
		}),
		FSKeyRegistry: getContract({
			client: bundledClient,
			...contractDefinitions.FSKeyRegistry,
		}),
		$client: client,
	} as FilosignContracts<T>;

	if (contractDefinitions.FSPaymentValidator) {
		(
			contracts as FilosignContracts<T> & {
				FSPaymentValidator: NonNullable<
					FilosignContracts<T>["FSPaymentValidator"]
				>;
			}
		).FSPaymentValidator = getContract({
			client: bundledClient,
			...contractDefinitions.FSPaymentValidator,
		}) as NonNullable<FilosignContracts<T>["FSPaymentValidator"]>;
	}

	return contracts;
}
