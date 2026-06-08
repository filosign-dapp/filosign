import { useMemo } from "react";
import { getContract } from "thirdweb";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { SUPPORTED_TOKENS } from "@/src/constants";
import { defaultThirdwebChain, thirdwebClient } from "@/src/lib/web3/config";
import { formatUsdcAmount } from "@/src/lib/web3/format-usdc";

const usdc = SUPPORTED_TOKENS[0];
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export function useWalletUsdcBalance(options?: { enabled?: boolean }) {
	const account = useActiveAccount();
	const address = account?.address as `0x${string}` | undefined;
	const queryEnabled = (options?.enabled ?? true) && Boolean(address);

	const usdcContract = useMemo(
		() =>
			getContract({
				client: thirdwebClient,
				address: usdc.address,
				chain: defaultThirdwebChain,
			}),
		[],
	);

	const { data, isPending, isError, refetch } = useReadContract({
		contract: usdcContract,
		method: "function balanceOf(address account) view returns (uint256)",
		params: address ? [address] : [ZERO_ADDRESS],
		queryOptions: { enabled: queryEnabled },
	});

	const balance = typeof data === "bigint" ? data : 0n;

	return {
		address,
		balance,
		formatted: formatUsdcAmount(balance, usdc.decimals),
		isPending: queryEnabled && isPending,
		isError: queryEnabled && isError,
		refetch,
	};
}
