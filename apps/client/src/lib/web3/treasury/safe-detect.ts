import { safeTransactionServiceUrlForChainId } from "@filosign/shared";
import {
	type Address,
	createPublicClient,
	http,
	type PublicClient,
} from "viem";
import { treasuryChain } from "@/src/lib/web3/treasury/chain";

const SAFE_THRESHOLD_ABI = [
	{
		type: "function",
		name: "getThreshold",
		stateMutability: "view",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
	},
] as const;

export type TreasuryWalletKind = "eoa" | "safe";

export function treasurySafeServiceAvailable(chainId: number): boolean {
	return safeTransactionServiceUrlForChainId(chainId) !== null;
}

export function createTreasuryPublicClient(): PublicClient {
	const chain = treasuryChain();
	return createPublicClient({ chain, transport: http() });
}

export async function readSafeThreshold(
	client: PublicClient,
	address: Address,
): Promise<bigint | null> {
	const code = await client.getCode({ address });
	if (!code || code === "0x") return null;

	try {
		const threshold = await client.readContract({
			address,
			abi: SAFE_THRESHOLD_ABI,
			functionName: "getThreshold",
		});
		return threshold > 0n ? threshold : null;
	} catch {
		return null;
	}
}

export async function detectTreasuryWalletKind(
	address: Address,
	client?: PublicClient,
): Promise<TreasuryWalletKind> {
	const readClient = client ?? createTreasuryPublicClient();
	const threshold = await readSafeThreshold(readClient, address);
	return threshold !== null ? "safe" : "eoa";
}
