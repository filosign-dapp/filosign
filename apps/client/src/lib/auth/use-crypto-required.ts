import { useCryptoUnlocked } from "@filosign/react/auth";
import { useMemo } from "react";
import { useCryptoUnlockContext } from "./crypto-unlock-provider";

export function useCryptoRequired(options?: { enabled?: boolean }) {
	const enabled = options?.enabled ?? true;
	const cryptoUnlocked = useCryptoUnlocked();
	const unlock = useCryptoUnlockContext();

	const isReady = !enabled || cryptoUnlocked.data === true;
	const needsRecovery = enabled && !isReady && unlock.recoveryRequired;

	return useMemo(
		() => ({
			enabled,
			isReady,
			needsRecovery,
			recoveryPhrase: unlock.recoveryPhrase,
			setRecoveryPhrase: unlock.setRecoveryPhrase,
			recoveryError: unlock.error,
			submitRecovery: unlock.handleRecover,
			resetRecovery: unlock.resetRecoveryGate,
			recoveryPending: unlock.recoveryPending,
			tryingWalletUnlock: unlock.tryingWalletUnlock,
			walletUnlockError: unlock.walletUnlockError,
			retryWalletUnlock: unlock.retryWalletUnlock,
		}),
		[
			enabled,
			isReady,
			needsRecovery,
			unlock.recoveryPhrase,
			unlock.setRecoveryPhrase,
			unlock.error,
			unlock.handleRecover,
			unlock.resetRecoveryGate,
			unlock.recoveryPending,
			unlock.tryingWalletUnlock,
			unlock.walletUnlockError,
			unlock.retryWalletUnlock,
		],
	);
}
