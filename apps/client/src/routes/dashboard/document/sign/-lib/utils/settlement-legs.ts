import { parseUnits } from "viem";
import { SUPPORTED_TOKENS } from "@/src/constants";

export function legsToDraftAmounts(
	legs: { recipientWallet: `0x${string}`; amountUsdc: string }[],
) {
	const decimals = SUPPORTED_TOKENS[0]?.decimals ?? 6;
	return legs.map((leg) => ({
		recipientWallet: leg.recipientWallet,
		amount: parseUnits(leg.amountUsdc.trim(), decimals),
	}));
}
