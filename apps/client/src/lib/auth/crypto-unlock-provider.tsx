import { useFilosignContext } from "@filosign/react";
import { useLogin, useRecoverWithPhrase } from "@filosign/react/auth";
import { useQueryClient } from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { hydrationMark } from "@/src/lib/utils/hydration-lifecycle";
import {
	attemptWalletLoginUnlock,
	delay,
	formatRecoveryPhraseError,
	submitRecoveryPhraseUnlock,
} from "./unlock-session";
import {
	useSessionGateAnalytics,
	useSessionGateDerived,
	useSessionGateFlags,
} from "./use-session-gate";

const MAX_WALLET_UNLOCK_ATTEMPTS = 3;
const WALLET_UNLOCK_RETRY_DELAY_MS = 600;

type CryptoUnlockContextValue = {
	tryingWalletUnlock: boolean;
	recoveryRequired: boolean;
	walletUnlockError: string | null;
	recoveryPhrase: string;
	setRecoveryPhrase: (value: string) => void;
	error: string;
	recoveryPending: boolean;
	handleRecover: () => Promise<void>;
	resetRecoveryGate: () => void;
	retryWalletUnlock: () => void;
};

const CryptoUnlockContext = createContext<CryptoUnlockContextValue | null>(
	null,
);

export function CryptoUnlockProvider({ children }: { children: ReactNode }) {
	const flags = useSessionGateFlags();
	const derived = useSessionGateDerived(flags);
	const { wallet } = useFilosignContext();
	const login = useLogin();
	const recoverWithPhrase = useRecoverWithPhrase();
	const queryClient = useQueryClient();

	const [recoveryRequired, setRecoveryRequired] = useState(false);
	const [walletUnlockError, setWalletUnlockError] = useState<string | null>(
		null,
	);
	const [recoveryPhrase, setRecoveryPhrase] = useState("");
	const [error, setError] = useState("");
	const [tryingWalletUnlock, setTryingWalletUnlock] = useState(false);
	const [unlockAttemptId, setUnlockAttemptId] = useState(0);
	const walletUnlockStartedRef = useRef(false);
	const lastWalletRef = useRef<string | null>(null);

	useSessionGateAnalytics();

	const resetUnlockAttemptState = useCallback(() => {
		walletUnlockStartedRef.current = false;
		setWalletUnlockError(null);
	}, []);

	useEffect(() => {
		const walletAddress = wallet?.account?.address?.toLowerCase() ?? null;
		if (lastWalletRef.current === walletAddress) return;
		lastWalletRef.current = walletAddress;
		resetUnlockAttemptState();
		setRecoveryRequired(false);
		setRecoveryPhrase("");
		setError("");
	}, [wallet?.account?.address, resetUnlockAttemptState]);

	useEffect(() => {
		hydrationMark("crypto-unlock:flags", {
			ready: flags.ready,
			authenticated: flags.authenticated,
			isRegistered: flags.isRegistered,
			isRegisteredPending: flags.isRegisteredPending,
			isCryptoUnlocked: flags.isCryptoUnlocked,
			isCryptoUnlockedPending: flags.isCryptoUnlockedPending,
			hasStoredKeygenData: flags.hasStoredKeygenData,
			recoveryRequired,
			walletUnlockError,
		});
	}, [
		flags.ready,
		flags.authenticated,
		flags.isRegistered,
		flags.isRegisteredPending,
		flags.isCryptoUnlocked,
		flags.isCryptoUnlockedPending,
		flags.hasStoredKeygenData,
		recoveryRequired,
		walletUnlockError,
	]);

	useEffect(() => {
		if (flags.isCryptoUnlocked) {
			setRecoveryRequired(false);
			setRecoveryPhrase("");
			setError("");
			resetUnlockAttemptState();
		}
	}, [flags.isCryptoUnlocked, resetUnlockAttemptState]);

	useEffect(() => {
		if (flags.isCryptoUnlocked) return;
		if (recoveryRequired) return;
		if (!derived.canAttemptWalletLogin) {
			walletUnlockStartedRef.current = false;
			return;
		}
		if (walletUnlockStartedRef.current) return;
		if (walletUnlockError) return;

		walletUnlockStartedRef.current = true;
		setTryingWalletUnlock(true);
		hydrationMark("crypto-unlock:attempt-start");

		let cancelled = false;

		void (async () => {
			let lastFailedMessage = "Could not unlock with your wallet. Try again.";

			for (
				let attempt = 0;
				attempt < MAX_WALLET_UNLOCK_ATTEMPTS && !cancelled;
				attempt += 1
			) {
				if (attempt > 0) {
					await delay(WALLET_UNLOCK_RETRY_DELAY_MS);
				}
				if (cancelled) return;

				const outcome = await attemptWalletLoginUnlock({
					login: {
						mutateAsync: () => login.mutateAsync({ unlockOnly: true }),
					},
				});

				if (cancelled) return;

				if (outcome === "success") {
					resetUnlockAttemptState();
					return;
				}
				if (outcome === "recovery_required") {
					setRecoveryRequired(true);
					resetUnlockAttemptState();
					return;
				}

				lastFailedMessage = outcome.failed;

				if (outcome.isCancelled) {
					break;
				}
			}

			if (!cancelled) {
				setWalletUnlockError(lastFailedMessage);
				walletUnlockStartedRef.current = false;
			}
		})().finally(() => {
			if (!cancelled) {
				setTryingWalletUnlock(false);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [
		derived.canAttemptWalletLogin,
		flags.isCryptoUnlocked,
		login,
		recoveryRequired,
		resetUnlockAttemptState,
		unlockAttemptId,
		walletUnlockError,
	]);

	const retryWalletUnlock = useCallback(() => {
		resetUnlockAttemptState();
		setUnlockAttemptId((current) => current + 1);
	}, [resetUnlockAttemptState]);

	const handleRecover = useCallback(async () => {
		if (!recoveryPhrase.trim()) return;
		try {
			setError("");
			await submitRecoveryPhraseUnlock({
				phrase: recoveryPhrase,
				recoverWithPhrase,
				queryClient,
				walletAddress: wallet?.account?.address,
			});
			setRecoveryRequired(false);
			setRecoveryPhrase("");
			setWalletUnlockError(null);
		} catch (recoverErr) {
			setError(formatRecoveryPhraseError(recoverErr));
			throw recoverErr;
		}
	}, [
		recoveryPhrase,
		recoverWithPhrase,
		queryClient,
		wallet?.account?.address,
	]);

	const resetRecoveryGate = useCallback(() => {
		setRecoveryPhrase("");
		setError("");
		setRecoveryRequired(false);
		resetUnlockAttemptState();
	}, [resetUnlockAttemptState]);

	return (
		<CryptoUnlockContext.Provider
			value={{
				tryingWalletUnlock,
				recoveryRequired,
				walletUnlockError,
				recoveryPhrase,
				setRecoveryPhrase,
				error,
				recoveryPending: recoverWithPhrase.isPending,
				handleRecover,
				resetRecoveryGate,
				retryWalletUnlock,
			}}
		>
			{children}
		</CryptoUnlockContext.Provider>
	);
}

export function useCryptoUnlockContext() {
	const context = useContext(CryptoUnlockContext);
	if (!context) {
		throw new Error(
			"useCryptoUnlockContext must be used inside CryptoUnlockProvider",
		);
	}
	return context;
}
