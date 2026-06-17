import { useMemo } from "react";
import { useWalletUsdcBalance } from "@/src/lib/web3/use-wallet-usdc-balance";
import { usePayoutPayerAddress } from "./use-payout-payer-address";

export function usePayoutPayerBalance(
	payoutPayerSource: "sender" | "org_wallet" | undefined,
	options?: { enabled?: boolean },
) {
	const payerAddress = usePayoutPayerAddress(payoutPayerSource);
	const balance = useWalletUsdcBalance({
		walletAddress: payerAddress,
		enabled: options?.enabled,
	});

	const payerLabel = useMemo((): "treasury" | "wallet" => {
		return payoutPayerSource === "org_wallet" ? "treasury" : "wallet";
	}, [payoutPayerSource]);

	return {
		payerAddress,
		payerLabel,
		...balance,
	};
}
