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
import {
	type ChainDefinitionsEntry,
	type ChainKey,
	getDefinitionsEntry,
} from "../definitions/index";

export type { ChainKey } from "../definitions/index";

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
	$client: T;
};

function getKeyedClient<T extends Client | WalletClient>(client: T) {
	return {
		public: createPublicClient({
			transport: http(client.chain?.rpcUrls.default.http[0]),
		}),
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

	const contractDefinitions = getDefinitionsEntry(chainKey);
	const bundledClient = getKeyedClient(client);

	return {
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
}
