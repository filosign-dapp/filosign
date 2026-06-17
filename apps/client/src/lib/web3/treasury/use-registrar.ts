import { useFilosignContext } from "@filosign/react";
import type { SendFileArgs } from "@filosign/react/files";
import { walletAccountAddress } from "@filosign/react/utils";
import { useMemo } from "react";
import { getAddress, isAddress } from "viem";
import { useOrgWalletAddress } from "@/src/lib/domains/orgs/use-org-wallet-address";
import { createTreasurySettlementRegistrar } from "./register-rules";

export function useTreasurySettlementRegistrar(
	payoutPayerSource: "sender" | "org_wallet" | undefined,
): SendFileArgs["registerSettlementRules"] | undefined {
	const { contracts, wallet, runtime } = useFilosignContext();
	const orgWalletAddress = useOrgWalletAddress();
	const connectedWalletAddress = wallet?.account
		? walletAccountAddress(wallet.account)
		: undefined;

	const treasuryRegistrar = useMemo(() => {
		if (!contracts || !runtime.chainKey) return undefined;
		return createTreasurySettlementRegistrar({
			contracts,
			chainKey: runtime.chainKey,
		});
	}, [contracts, runtime.chainKey]);

	return useMemo(() => {
		if (payoutPayerSource !== "org_wallet" || !treasuryRegistrar) {
			return undefined;
		}

		if (
			!orgWalletAddress ||
			!isAddress(orgWalletAddress) ||
			!connectedWalletAddress
		) {
			return undefined;
		}

		if (
			getAddress(connectedWalletAddress).toLowerCase() ===
			getAddress(orgWalletAddress).toLowerCase()
		) {
			return undefined;
		}

		return treasuryRegistrar;
	}, [
		orgWalletAddress,
		connectedWalletAddress,
		payoutPayerSource,
		treasuryRegistrar,
	]);
}
