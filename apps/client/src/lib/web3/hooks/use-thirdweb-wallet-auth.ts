import { useCallback } from "react";
import {
	useActiveAccount,
	useActiveWallet,
	useConnectModal,
	useDisconnect,
} from "thirdweb/react";
import { thirdwebConnectModalOptions } from "@/src/lib/web3/config/wallet-modal-options";
import { useThirdwebConnection } from "@/src/lib/web3/hooks/use-thirdweb-connection";

/** Wallet login state and connect/disconnect actions. */
export function useThirdwebWalletAuth() {
	const { ready, authenticated, isConnecting } = useThirdwebConnection();
	const account = useActiveAccount();
	const activeWallet = useActiveWallet();
	const { disconnect } = useDisconnect();
	const { connect } = useConnectModal();

	const signIn = useCallback(async () => {
		return connect(thirdwebConnectModalOptions);
	}, [connect]);

	const logout = useCallback(async () => {
		if (!activeWallet) return;
		await disconnect(activeWallet);
	}, [activeWallet, disconnect]);

	const user = account?.address
		? { wallet: { address: account.address } }
		: null;

	return {
		ready,
		authenticated,
		isConnecting,
		user,
		signIn,
		logout,
	} as const;
}
