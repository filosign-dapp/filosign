import { useFilosignContext } from "@filosign/react";
import { useLogin, useRecoverWithPhrase } from "@filosign/react/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
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

/**
 * Shared wallet → Filosign login unlock (dashboard protector + sign invite unlock).
 */
export function useWalletUnlock(options?: { enabled?: boolean }) {
	const enabled = options?.enabled ?? true;
	const flags = useSessionGateFlags();
	const derived = useSessionGateDerived(flags);
	const { wallet } = useFilosignContext();
	const login = useLogin();
	const recoverWithPhrase = useRecoverWithPhrase();
	const queryClient = useQueryClient();

	const [showRecoveryGate, setShowRecoveryGate] = useState(false);
	const [recoveryPhrase, setRecoveryPhrase] = useState("");
	const [error, setError] = useState("");
	const [tryingWalletUnlock, setTryingWalletUnlock] = useState(false);
	const walletUnlockStartedRef = useRef(false);

	useSessionGateAnalytics();

	useEffect(() => {
		hydrationMark("wallet-unlock:flags", {
			ready: flags.ready,
			authenticated: flags.authenticated,
			isRegistered: flags.isRegistered,
			isRegisteredPending: flags.isRegisteredPending,
			isCryptoUnlocked: flags.isCryptoUnlocked,
			isCryptoUnlockedPending: flags.isCryptoUnlockedPending,
		});
	}, [
		flags.ready,
		flags.authenticated,
		flags.isRegistered,
		flags.isRegisteredPending,
		flags.isCryptoUnlocked,
		flags.isCryptoUnlockedPending,
	]);

	useEffect(() => {
		hydrationMark("wallet-unlock:derived", {
			canAttemptWalletLogin: derived.canAttemptWalletLogin,
			shouldShowBootstrapLoader: derived.shouldShowBootstrapLoader,
			filosignSessionActive: derived.filosignSessionActive,
			shouldRedirectToSignIn: derived.shouldRedirectToSignIn,
			tryingWalletUnlock,
			showRecoveryGate,
		});
	}, [
		derived.canAttemptWalletLogin,
		derived.shouldShowBootstrapLoader,
		derived.filosignSessionActive,
		derived.shouldRedirectToSignIn,
		tryingWalletUnlock,
		showRecoveryGate,
	]);

	useEffect(() => {
		if (flags.isCryptoUnlocked) {
			setShowRecoveryGate(false);
			setRecoveryPhrase("");
			setError("");
			walletUnlockStartedRef.current = false;
		}
	}, [flags.isCryptoUnlocked]);

	useEffect(() => {
		if (!enabled) return;
		if (flags.isCryptoUnlocked) return;
		if (!derived.canAttemptWalletLogin) {
			walletUnlockStartedRef.current = false;
			return;
		}
		if (walletUnlockStartedRef.current) return;
		if (showRecoveryGate) return;

		walletUnlockStartedRef.current = true;
		setTryingWalletUnlock(true);
		hydrationMark("wallet-unlock:effect-trigger-login");

		void attemptWalletLoginUnlock({
			login: {
				mutateAsync: (args) => login.mutateAsync({ unlockOnly: true, ...args }),
			},
			onRecoveryRequired: () => {
				setShowRecoveryGate(true);
				walletUnlockStartedRef.current = false;
			},
		}).finally(() => {
			setTryingWalletUnlock(false);
		});
	}, [
		enabled,
		derived.canAttemptWalletLogin,
		flags.isCryptoUnlocked,
		login,
		showRecoveryGate,
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
			setShowRecoveryGate(false);
			setRecoveryPhrase("");
		} catch (recoverErr) {
			setError(formatRecoveryPhraseError(recoverErr));
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
		walletUnlockStartedRef.current = false;
	}, []);

	return {
		flags,
		derived,
		showRecoveryGate,
		setShowRecoveryGate,
		recoveryPhrase,
		setRecoveryPhrase,
		error,
		tryingWalletUnlock,
		handleRecover,
		resetRecoveryGate,
		login,
		recoverWithPhrase,
	};
}
