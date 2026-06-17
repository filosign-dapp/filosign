import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getContract } from "thirdweb";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import {
	type Address,
	createPublicClient,
	getAddress,
	http,
	isAddress,
} from "viem";
import { defaultChain, SUPPORTED_TOKENS } from "@/src/constants";
import { defaultThirdwebChain, thirdwebClient } from "@/src/lib/web3/config";
import { formatUsdcAmount } from "@/src/lib/web3/format-usdc";

const usdc = SUPPORTED_TOKENS[0];
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const ERC20_BALANCE_OF_ABI = [
	{
		type: "function",
		name: "balanceOf",
		stateMutability: "view",
		inputs: [{ name: "account", type: "address" }],
		outputs: [{ name: "", type: "uint256" }],
	},
] as const;

const explicitBalancePublicClient = createPublicClient({
	chain: defaultChain,
	transport: http(),
});

type UseWalletUsdcBalanceOptions = {
	enabled?: boolean;
	/** When set, reads this address only (no connected-wallet fallback). */
	walletAddress?: `0x${string}` | undefined;
};

function normalizeReadAddress(
	value: string | undefined,
): `0x${string}` | undefined {
	if (!value || !isAddress(value)) return undefined;
	return getAddress(value) as `0x${string}`;
}

async function readExplicitUsdcBalance(address: Address): Promise<bigint> {
	return explicitBalancePublicClient.readContract({
		address: usdc.address,
		abi: ERC20_BALANCE_OF_ABI,
		functionName: "balanceOf",
		args: [address],
	});
}

function useConnectedWalletUsdcBalance(options?: {
	enabled?: boolean;
	address?: `0x${string}`;
}) {
	const queryEnabled = (options?.enabled ?? true) && Boolean(options?.address);

	const usdcContract = useMemo(
		() =>
			getContract({
				client: thirdwebClient,
				address: usdc.address,
				chain: defaultThirdwebChain,
			}),
		[],
	);

	const { data, isPending, isFetching, isError, refetch } = useReadContract({
		contract: usdcContract,
		method: "function balanceOf(address account) view returns (uint256)",
		params: options?.address ? [options.address] : [ZERO_ADDRESS],
		queryOptions: {
			enabled: queryEnabled,
		},
	});

	const balance = typeof data === "bigint" ? data : 0n;

	return {
		balance,
		isPending: queryEnabled && (isPending || isFetching),
		isError: queryEnabled && isError,
		refetch,
	};
}

function useExplicitWalletUsdcBalance(options: {
	enabled: boolean;
	address?: `0x${string}`;
}) {
	const queryEnabled = options.enabled && Boolean(options.address);

	const { data, isPending, isFetching, isError, refetch } = useQuery({
		queryKey: [
			"filosign",
			"usdc-balance",
			defaultChain.id,
			usdc.address,
			options.address,
		] as const,
		queryFn: () => readExplicitUsdcBalance(options.address as Address),
		enabled: queryEnabled,
		placeholderData: undefined,
	});

	const balance = typeof data === "bigint" ? data : 0n;

	return {
		balance,
		isPending: queryEnabled && (isPending || isFetching),
		isError: queryEnabled && isError,
		refetch,
	};
}

export function useWalletUsdcBalance(options?: UseWalletUsdcBalanceOptions) {
	const account = useActiveAccount();
	const hasExplicitWallet =
		options !== undefined && Object.hasOwn(options, "walletAddress");
	const address = hasExplicitWallet
		? normalizeReadAddress(options.walletAddress)
		: normalizeReadAddress(account?.address);
	const queryEnabled = (options?.enabled ?? true) && Boolean(address);

	const connected = useConnectedWalletUsdcBalance({
		enabled: !hasExplicitWallet && queryEnabled,
		address,
	});
	const explicit = useExplicitWalletUsdcBalance({
		enabled: hasExplicitWallet && queryEnabled,
		address,
	});

	const source = hasExplicitWallet ? explicit : connected;
	const balance = queryEnabled ? source.balance : 0n;

	return {
		address,
		balance,
		formatted: formatUsdcAmount(balance, usdc.decimals),
		isPending: source.isPending,
		isError: source.isError,
		refetch: source.refetch,
	};
}
