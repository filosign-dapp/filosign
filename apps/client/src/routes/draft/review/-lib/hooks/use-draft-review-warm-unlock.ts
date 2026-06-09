import { useFilosignContext } from "@filosign/react";
import {
	useCryptoUnlocked,
	useIsLoggedIn,
	useIsRegistered,
	useLogout,
} from "@filosign/react/auth";
import {
	DRAFT_REVIEW_MISSING_CRYPTO_SEED,
	useDecryptDraftReviewWarm,
	useDraftReviewByToken,
} from "@filosign/react/drafts";
import {
	filosignNonRpcRoots,
	queryKeyHasNonRpcRoot,
} from "@filosign/react/query-keys";
import { useUserProfile } from "@filosign/react/users";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCryptoRequired } from "@/src/lib/auth/use-crypto-required";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import {
	useThirdweb,
	useThirdwebLoginAction,
} from "@/src/lib/web3/use-thirdweb";
import {
	resolveDraftReviewWarmPanel,
	warmPanelStatusMessage,
} from "@/src/routes/draft/review/-lib/hooks/resolve-warm-panel";
import type { DecryptedDraftReview } from "@/src/routes/draft/review/-lib/types";
import { executeSwitchAccountLogout } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";

export type DraftReviewWarmPanel =
	| "signingIn"
	| "busy"
	| "unlocking"
	| "recovery"
	| "wrongAccount"
	| "decrypting"
	| "decryptFailed"
	| "ready"
	| "needsRegistration"
	| null;

function normalizeEmail(email: string | undefined | null): string {
	return email?.trim().toLowerCase() ?? "";
}

export function useDraftReviewWarmUnlock(token: string) {
	const active = Boolean(token.trim());
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { ready, authenticated, user, logout: logoutWallet } = useThirdweb();
	const login = useThirdwebLoginAction();
	const logoutFilosign = useLogout();
	const clearOnboardingForm = useStorePersist((s) => s.clearOnboardingForm);
	const { wallet } = useFilosignContext();

	const payload = useDraftReviewByToken(active ? token : undefined);
	const decryptWarm = useDecryptDraftReviewWarm();
	const { data: userProfile } = useUserProfile();
	const isRegistered = useIsRegistered();
	const apiSession = useIsLoggedIn();
	const cryptoUnlocked = useCryptoUnlocked();

	const data = payload.data;
	const isWarm = data?.accessKind === "warm";
	const inviteEmail =
		data?.accessKind === "warm" ? normalizeEmail(data.email) : "";

	const cryptoRequired = useCryptoRequired({
		enabled:
			active &&
			isWarm &&
			ready &&
			authenticated &&
			isRegistered.data === true &&
			!isRegistered.isPending,
	});

	const [decrypted, setDecrypted] = useState<DecryptedDraftReview | null>(null);
	const [decryptError, setDecryptError] = useState<string | null>(null);
	const [missingSeedHint, setMissingSeedHint] = useState(false);
	const autoWalletLoginRef = useRef(false);
	const autoDecryptStartedRef = useRef(false);

	const loggedInEmail = useMemo(
		() =>
			normalizeEmail(
				user?.email?.address?.trim() || user?.google?.email?.trim() || "",
			),
		[user?.email?.address, user?.google?.email],
	);

	const profileEmail = normalizeEmail(userProfile?.email);
	const signedInEmailForUi =
		user?.email?.address?.trim() ||
		user?.google?.email?.trim() ||
		userProfile?.email?.trim() ||
		"";

	const inviteMatchesCurrentUser = useMemo(() => {
		if (!inviteEmail) return true;
		if (loggedInEmail && loggedInEmail === inviteEmail) return true;
		if (profileEmail && profileEmail === inviteEmail) return true;
		return !loggedInEmail && !profileEmail;
	}, [inviteEmail, loggedInEmail, profileEmail]);

	const shouldSwitchAccount =
		active &&
		isWarm &&
		Boolean(inviteEmail) &&
		authenticated &&
		!inviteMatchesCurrentUser;

	useEffect(() => {
		setDecrypted(null);
		setDecryptError(null);
		setMissingSeedHint(false);
		autoDecryptStartedRef.current = false;
		autoWalletLoginRef.current = false;
	}, [token]);

	useEffect(() => {
		if (!active || !isWarm || authenticated || autoWalletLoginRef.current) {
			return;
		}
		autoWalletLoginRef.current = true;
		void login();
	}, [active, isWarm, authenticated, login]);

	const resetAfterSwitchAccount = useCallback(() => {
		setDecryptError(null);
		cryptoRequired.setRecoveryPhrase("");
		cryptoRequired.resetRecovery();
		autoWalletLoginRef.current = false;
		autoDecryptStartedRef.current = false;
	}, [cryptoRequired]);

	const runSwitchAccount = useCallback(async () => {
		await executeSwitchAccountLogout({
			clearOnboardingForm,
			wallet,
			logoutFilosign,
			logoutWallet,
			navigate,
			stayAfterLogout: true,
			onStayAfterLogout: resetAfterSwitchAccount,
		});
	}, [
		clearOnboardingForm,
		wallet,
		logoutFilosign,
		logoutWallet,
		navigate,
		resetAfterSwitchAccount,
	]);

	const submitFilosignRecovery = useCallback(async () => {
		if (!cryptoRequired.recoveryPhrase.trim()) return;
		setDecryptError(null);
		try {
			await cryptoRequired.submitRecovery();
			setMissingSeedHint(false);
			autoDecryptStartedRef.current = false;
			await queryClient.refetchQueries({
				predicate: (q) =>
					queryKeyHasNonRpcRoot(q.queryKey, filosignNonRpcRoots.cryptoUnlocked),
			});
		} catch (e) {
			const msg =
				e instanceof Error
					? e.message.includes("unlock") || e.message.includes("phrase")
						? "Invalid recovery phrase"
						: e.message
					: "Could not unlock with this phrase";
			setDecryptError(msg);
		}
	}, [cryptoRequired, queryClient]);

	const runDecrypt = useCallback(async () => {
		if (!active || !isWarm || shouldSwitchAccount) return;
		setDecryptError(null);
		try {
			const res = await decryptWarm.mutateAsync({ inviteToken: token });
			if (res.documents.length === 0) {
				setDecryptError("No documents found in this draft.");
				return;
			}
			setDecrypted({
				title: res.title,
				snapshot: res.snapshot,
				documents: res.documents,
			});
		} catch (e) {
			if (
				e instanceof Error &&
				e.message === DRAFT_REVIEW_MISSING_CRYPTO_SEED
			) {
				setMissingSeedHint(true);
				autoDecryptStartedRef.current = false;
				return;
			}
			const msg =
				e instanceof Error
					? e.message
					: "Could not decrypt this draft. Confirm you're signed in with the invited wallet and complete encryption unlock (wallet sign or recovery phrase).";
			setDecryptError(msg);
			autoDecryptStartedRef.current = false;
		}
	}, [active, isWarm, shouldSwitchAccount, decryptWarm, token]);

	useEffect(() => {
		if (!active || !isWarm || shouldSwitchAccount) return;
		if (!authenticated || !apiSession.data || !cryptoUnlocked.data) return;
		if (autoDecryptStartedRef.current || decrypted) return;
		autoDecryptStartedRef.current = true;
		void runDecrypt();
	}, [
		active,
		isWarm,
		shouldSwitchAccount,
		authenticated,
		apiSession.data,
		cryptoUnlocked.data,
		decrypted,
		runDecrypt,
	]);

	const warmPanel = useMemo(
		(): DraftReviewWarmPanel =>
			resolveDraftReviewWarmPanel({
				active,
				isWarm,
				shouldSwitchAccount,
				authenticated,
				payloadLoading: payload.isLoading,
				isRegisteredPending: isRegistered.isPending,
				isRegisteredData: isRegistered.data,
				apiSessionPending: apiSession.isPending,
				apiSessionData: apiSession.data,
				cryptoUnlockedPending: cryptoUnlocked.isPending,
				cryptoUnlockedData: cryptoUnlocked.data,
				needsRecovery: cryptoRequired.needsRecovery,
				tryingWalletUnlock: cryptoRequired.tryingWalletUnlock,
				missingSeedHint,
				decryptPending: decryptWarm.isPending,
				decrypted,
				decryptError,
			}),
		[
			active,
			isWarm,
			shouldSwitchAccount,
			authenticated,
			payload.isLoading,
			isRegistered.isPending,
			isRegistered.data,
			apiSession.isPending,
			apiSession.data,
			cryptoUnlocked.isPending,
			cryptoUnlocked.data,
			cryptoRequired.needsRecovery,
			cryptoRequired.tryingWalletUnlock,
			missingSeedHint,
			decryptWarm.isPending,
			decrypted,
			decryptError,
		],
	);

	const warmStatusMessage = useMemo(
		() => warmPanelStatusMessage(warmPanel),
		[warmPanel],
	);

	return {
		active,
		isWarm,
		payload,
		warmPanel,
		warmStatusMessage,
		decrypted,
		decryptError,
		shouldSwitchAccount,
		inviteEmail,
		signedInEmailForUi,
		filosignRecoveryPhrase: cryptoRequired.recoveryPhrase,
		setFilosignRecoveryPhrase: cryptoRequired.setRecoveryPhrase,
		submitFilosignRecovery,
		isFilosignRecoveryPending: cryptoRequired.recoveryPending,
		runSwitchAccount,
		retryDecrypt: runDecrypt,
	};
}
