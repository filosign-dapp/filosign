import { useCryptoUnlocked } from "@filosign/react/auth";
import { useMemo } from "react";
import { useCryptoUnlockContext } from "./crypto-unlock-provider";

export function useCryptoRequired(options?: { enabled?: boolean }) {
	const enabled = options?.enabled ?? true;
	const cryptoUnlocked = useCryptoUnlocked();
	const unlock = useCryptoUnlockContext();

	const isReady = !enabled || cryptoUnlocked.data === true;
	const needsRecovery = enabled && !isReady && unlock.recoveryRequired;
	const isPending =
		enabled &&
		!isReady &&
		(!needsRecovery || unlock.tryingWalletUnlock || cryptoUnlocked.isPending);

	return useMemo(
		() => ({
			enabled,
			isReady,
			isPending,
			needsRecovery,
			recoveryPhrase: unlock.recoveryPhrase,
			setRecoveryPhrase: unlock.setRecoveryPhrase,
			recoveryError: unlock.error,
			submitRecovery: unlock.handleRecover,
			resetRecovery: unlock.resetRecoveryGate,
			recoveryPending: unlock.recoverWithPhrase.isPending,
			tryingWalletUnlock: unlock.tryingWalletUnlock,
		}),
		[
			enabled,
			isReady,
			isPending,
			needsRecovery,
			unlock.recoveryPhrase,
			unlock.setRecoveryPhrase,
			unlock.error,
			unlock.handleRecover,
			unlock.resetRecoveryGate,
			unlock.recoverWithPhrase.isPending,
			unlock.tryingWalletUnlock,
		],
	);
}
