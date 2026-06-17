import { useFilosignContext } from "@filosign/react";
import { walletAccountAddress } from "@filosign/react/utils";
import { useMemo } from "react";
import { useOrgWalletAddress } from "@/src/lib/domains/orgs/use-org-wallet-address";
import { resolvePayoutPayerAddress } from "../utils/resolve-payer-address";

export function usePayoutPayerAddress(
	payoutPayerSource: "sender" | "org_wallet" | undefined,
) {
	const orgWalletAddress = useOrgWalletAddress();
	const { wallet } = useFilosignContext();
	const connectedWalletAddress = wallet?.account
		? walletAccountAddress(wallet.account)
		: undefined;

	return useMemo(
		() =>
			resolvePayoutPayerAddress({
				payoutPayerSource,
				connectedWalletAddress,
				orgWalletAddress,
			}),
		[payoutPayerSource, connectedWalletAddress, orgWalletAddress],
	);
}
