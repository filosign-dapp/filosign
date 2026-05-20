import { useCallback } from "react";
import { useWalletDetailsModal } from "thirdweb/react";
import { thirdwebWalletModalOptions } from "@/src/lib/web3/config/wallet-modal-options";

/** Opens thirdweb wallet details (buy / receive / send) for topping up USDC. */
export function useWalletTopUp() {
	const detailsModal = useWalletDetailsModal();

	const openTopUp = useCallback(async () => {
		detailsModal.open(thirdwebWalletModalOptions);
	}, [detailsModal]);

	return { openTopUp };
}
