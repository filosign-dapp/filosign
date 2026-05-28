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
	formatRecoveryPhraseError,
	submitRecoveryPhraseUnlock,
} from "./unlock-session";
import {
	useSessionGateAnalytics,
	useSessionGateDerived,
	useSessionGateFlags,
} from "./use-session-gate";

type CryptoUnlockContextValue = {
	flags: ReturnType<typeof useSessionGateFlags>;
	derived: ReturnType<typeof useSessionGateDerived>;
	tryingWalletUnlock: boolean;
	recoveryRequired: boolean;
	recoveryPhrase: string;
	setRecoveryPhrase: (value: string) => void;
	error: string;
	handleRecover: () => Promise<void>;
	resetRecoveryGate: () => void;
	login: ReturnType<typeof useLogin>;
	recoverWithPhrase: ReturnType<typeof useRecoverWithPhrase>;
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
	const [recoveryPhrase, setRecoveryPhrase] = useState("");
	const [error, setError] = useState("");
	const [tryingWalletUnlock, setTryingWalletUnlock] = useState(false);
	const walletUnlockStartedRef = useRef(false);
	const lastWalletRef = useRef<string | null>(null);

	useSessionGateAnalytics();

	useEffect(() => {
		const walletAddress = wallet?.account?.address?.toLowerCase() ?? null;
		if (lastWalletRef.current === walletAddress) return;
		lastWalletRef.current = walletAddress;
		walletUnlockStartedRef.current = false;
		setRecoveryRequired(false);
		setRecoveryPhrase("");
		setError("");
	}, [wallet?.account?.address]);

	useEffect(() => {
		hydrationMark("crypto-unlock:flags", {
			ready: flags.ready,
			authenticated: flags.authenticated,
			isRegistered: flags.isRegistered,
			isRegisteredPending: flags.isRegisteredPending,
			isCryptoUnlocked: flags.isCryptoUnlocked,
			isCryptoUnlockedPending: flags.isCryptoUnlockedPending,
			recoveryRequired,
		});
	}, [
		flags.ready,
		flags.authenticated,
		flags.isRegistered,
		flags.isRegisteredPending,
		flags.isCryptoUnlocked,
		flags.isCryptoUnlockedPending,
		recoveryRequired,
	]);

	useEffect(() => {
		if (flags.isCryptoUnlocked) {
			setRecoveryRequired(false);
			setRecoveryPhrase("");
			setError("");
			walletUnlockStartedRef.current = false;
		}
	}, [flags.isCryptoUnlocked]);

	useEffect(() => {
		if (flags.isCryptoUnlocked) return;
		if (!derived.canAttemptWalletLogin) {
			walletUnlockStartedRef.current = false;
			return;
		}
		if (walletUnlockStartedRef.current || recoveryRequired) return;

		walletUnlockStartedRef.current = true;
		setTryingWalletUnlock(true);
		hydrationMark("crypto-unlock:attempt-start");

		void attemptWalletLoginUnlock({
			login: {
				mutateAsync: (args) => login.mutateAsync({ unlockOnly: true, ...args }),
			},
			onRecoveryRequired: () => {
				setRecoveryRequired(true);
				walletUnlockStartedRef.current = false;
			},
		}).finally(() => {
			setTryingWalletUnlock(false);
		});
	}, [
		derived.canAttemptWalletLogin,
		flags.isCryptoUnlocked,
		login,
		recoveryRequired,
	]);

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
		walletUnlockStartedRef.current = false;
	}, []);

	return (
		<CryptoUnlockContext.Provider
			value={{
				flags,
				derived,
				tryingWalletUnlock,
				recoveryRequired,
				recoveryPhrase,
				setRecoveryPhrase,
				error,
				handleRecover,
				resetRecoveryGate,
				login,
				recoverWithPhrase,
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
