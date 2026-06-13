import { calibration, mainnet } from "@filoz/synapse-sdk";
import {
	type Address,
	createPublicClient,
	erc20Abi,
	http,
	parseEther,
} from "viem";
import env from "@/env";

export const FOC_FIL_ALERT_THRESHOLD_WEI = parseEther("0.05");
export const FOC_USDFC_ALERT_THRESHOLD_WEI = parseEther("5");

function filecoinChain() {
	return env.CHAIN === "mainnet" ? mainnet : calibration;
}

function usdfcTokenAddress(
	chain: typeof mainnet | typeof calibration,
): Address {
	const address = chain.contracts?.usdfc?.address;
	if (!address) {
		throw new Error("USDFC contract not configured for Filecoin chain");
	}
	return address;
}

export async function readFocWalletBalances(
	wallet: Address,
): Promise<{ filBalanceWei: bigint; usdfcBalanceWei: bigint }> {
	const chain = filecoinChain();
	const client = createPublicClient({
		chain,
		transport: http(chain.rpcUrls.default.http[0]),
	});

	const [filBalanceWei, usdfcBalanceWei] = await Promise.all([
		client.getBalance({ address: wallet }),
		client.readContract({
			address: usdfcTokenAddress(chain),
			abi: erc20Abi,
			functionName: "balanceOf",
			args: [wallet],
		}),
	]);

	return { filBalanceWei, usdfcBalanceWei };
}
