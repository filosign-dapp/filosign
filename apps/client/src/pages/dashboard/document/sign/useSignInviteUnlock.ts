import { normalizeColdInvitePhrase } from "@filosign/crypto-utils";
import { useFilosignContext } from "@filosign/react";
import {
	LOGIN_RECOVERY_PHRASE_REQUIRED,
	useIsLoggedIn,
	useIsRegistered,
	useLogin,
	useLogout,
	useRecoverWithPhrase,
} from "@filosign/react/auth";
import {
	useClaimColdInvite,
	useColdInviteDecrypt,
	useColdInvitePayload,
} from "@filosign/react/files";
import { fetchUserProfile, useUserProfile } from "@filosign/react/users";
import { buildClaimKemPayload } from "@filosign/react/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getAddress, type Hex } from "viem";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { useThirdwebLoginAction } from "@/src/lib/hooks/use-thirdweb-login";
import { useThirdwebUserInfo } from "@/src/lib/hooks/use-thirdweb-user-info";
import { useThirdwebWalletAuth } from "@/src/lib/hooks/use-thirdweb-wallet-auth";
import { coldInviteRecipientMatchesIdentity } from "@/src/lib/routing/cold-invite-search";
import { executeSwitchAccountLogout } from "@/src/pages/onboarding/_components/OnboardingSwitchAccountLink";

export function useSignInviteUnlock(args: {
	pieceCid: string;
	inviteToken: string;
}) {
	const { pieceCid, inviteToken } = args;
	const active = Boolean(inviteToken.trim());
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { rpc, session, wallet, rpcQuery } = useFilosignContext();
	const {
		ready,
		authenticated,
		logout: logoutWallet,
	} = useThirdwebWalletAuth();
	const { user } = useThirdwebUserInfo();
	const login = useThirdwebLoginAction();
	const { data: userProfile } = useUserProfile();
	const sdkLogin = useLogin();
	const logoutFilosign = useLogout();
	const clearOnboardingForm = useStorePersist((s) => s.clearOnboardingForm);
	const isRegistered = useIsRegistered();
	const isLoggedIn = useIsLoggedIn();
	const {
		data: invite,
		isLoading,
		error,
	} = useColdInvitePayload(active ? inviteToken : undefined);
	const coldDecrypt = useColdInviteDecrypt();
	const claimColdInvite = useClaimColdInvite();
	const recoverWithPhrase = useRecoverWithPhrase();

	const [phrase, setPhrase] = useState("");
	const [filosignRecoveryPhrase, setFilosignRecoveryPhrase] = useState("");
	const [claimSucceeded, setClaimSucceeded] = useState(false);
	const [decryptError, setDecryptError] = useState<string | null>(null);
	const [tryingWalletUnlock, setTryingWalletUnlock] = useState(false);
	const [showFilosignRecovery, setShowFilosignRecovery] = useState(false);
	const walletUnlockStartedRef = useRef(false);
	const autoWalletLoginRef = useRef(false);

	const resetWizardAfterSwitchAccount = useCallback(() => {
		setPhrase("");
		setFilosignRecoveryPhrase("");
		setDecryptError(null);
		setTryingWalletUnlock(false);
		setShowFilosignRecovery(false);
		walletUnlockStartedRef.current = false;
		autoWalletLoginRef.current = false;
	}, []);

	useEffect(() => {
		if (!active || !invite || authenticated || autoWalletLoginRef.current)
			return;
		autoWalletLoginRef.current = true;
		void login();
	}, [active, invite, authenticated, login]);

	const runSwitchAccount = useCallback(async () => {
		await executeSwitchAccountLogout({
			clearOnboardingForm,
			wallet,
			logoutFilosign,
			logoutWallet,
			navigate,
			stayAfterLogout: true,
			onStayAfterLogout: resetWizardAfterSwitchAccount,
		});
	}, [
		clearOnboardingForm,
		wallet,
		logoutFilosign,
		logoutWallet,
		navigate,
		resetWizardAfterSwitchAccount,
	]);

	const phraseNormalized = useMemo(
		() => normalizeColdInvitePhrase(phrase),
		[phrase],
	);

	const phraseWordCount = useMemo(() => {
		return phraseNormalized.split("-").filter(Boolean).length;
	}, [phraseNormalized]);

	const loggedInEmail = useMemo(
		() => user?.email?.address?.trim() || user?.google?.email?.trim() || "",
		[user?.email?.address, user?.google?.email],
	);

	const inviteMatchesCurrentUser = useMemo(() => {
		if (!invite) return false;
		return coldInviteRecipientMatchesIdentity({
			recipientEmails: invite.recipientEmails,
			loggedInEmail,
			profileEmail: userProfile?.email,
			senderWallet: wallet?.account?.address,
			inviteSender: invite.sender,
		});
	}, [invite, loggedInEmail, userProfile?.email, wallet?.account?.address]);

	const signedInEmailForUi = loggedInEmail || userProfile?.email?.trim() || "";

	const shouldSwitchAccountPrompt =
		active &&
		(invite?.recipientEmails.length ?? 0) > 0 &&
		authenticated &&
		!claimSucceeded &&
		!inviteMatchesCurrentUser;

	useEffect(() => {
		if (!active || !authenticated || !invite || claimSucceeded) return;
		if (isRegistered.isPending) return;
		if (isRegistered.data === false) {
			navigate({
				to: "/onboarding",
				search: {
					coldPieceCid: pieceCid,
					coldInvite: inviteToken,
				},
				replace: true,
			} as never);
		}
	}, [
		active,
		authenticated,
		invite,
		claimSucceeded,
		isRegistered.data,
		isRegistered.isPending,
		pieceCid,
		inviteToken,
		navigate,
	]);

	useEffect(() => {
		if (!active || !ready || !authenticated) return;
		if (!isRegistered.data || isRegistered.isPending) return;
		if (isLoggedIn.data) {
			setShowFilosignRecovery(false);
			setFilosignRecoveryPhrase("");
			walletUnlockStartedRef.current = false;
			return;
		}
		if (isLoggedIn.isPending) return;
		if (showFilosignRecovery) return;

		const canTryWallet =
			authenticated &&
			isRegistered.data &&
			!isRegistered.isPending &&
			!isLoggedIn.data &&
			!isLoggedIn.isPending;

		if (!canTryWallet) {
			walletUnlockStartedRef.current = false;
			return;
		}

		if (walletUnlockStartedRef.current) return;
		walletUnlockStartedRef.current = true;
		setTryingWalletUnlock(true);

		void sdkLogin
			.mutateAsync({})
			.catch((err: unknown) => {
				if (
					err instanceof Error &&
					err.message === LOGIN_RECOVERY_PHRASE_REQUIRED
				) {
					setShowFilosignRecovery(true);
					walletUnlockStartedRef.current = false;
					return;
				}
				toast.error(
					err instanceof Error ? err.message : "Could not unlock session",
				);
				setShowFilosignRecovery(true);
				walletUnlockStartedRef.current = false;
			})
			.finally(() => {
				setTryingWalletUnlock(false);
			});
	}, [
		active,
		ready,
		authenticated,
		isRegistered.data,
		isRegistered.isPending,
		isLoggedIn.data,
		isLoggedIn.isPending,
		sdkLogin,
		showFilosignRecovery,
	]);

	const wizardPanel = useMemo(() => {
		if (!active || !invite) return null;
		if (!authenticated) return "signingIn" as const;
		if (isRegistered.isPending || isLoggedIn.isPending) return "busy" as const;
		if (isRegistered.data === false) return "redirecting" as const;
		if (!isLoggedIn.data && showFilosignRecovery)
			return "filosignRecovery" as const;
		if (!isLoggedIn.data && tryingWalletUnlock) return "unlocking" as const;
		if (!isLoggedIn.data) return "busy" as const;
		return "passphrase" as const;
	}, [
		active,
		invite,
		authenticated,
		isRegistered.isPending,
		isRegistered.data,
		isLoggedIn.isPending,
		isLoggedIn.data,
		showFilosignRecovery,
		tryingWalletUnlock,
	]);

	const claimWithWalletWrap = useCallback(
		async (dek: Uint8Array, recipientEncryptionPk: Hex) => {
			if (!wallet?.account?.address) {
				throw new Error("Missing recipient wallet");
			}

			const recipientWallet = getAddress(wallet.account.address);
			const { kemCiphertext, encryptedEncryptionKey } =
				await buildClaimKemPayload({
					dek,
					recipientEncryptionPk,
					pieceCid,
					recipientWalletAddress: recipientWallet,
				});

			await claimColdInvite.mutateAsync({
				inviteToken,
				kemCiphertext,
				encryptedEncryptionKey,
			});
		},
		[wallet?.account?.address, pieceCid, claimColdInvite, inviteToken],
	);

	const resolveRecipientEncryptionKey = useCallback(async (): Promise<Hex> => {
		await queryClient.refetchQueries({
			predicate: (q) =>
				Array.isArray(q.queryKey) && q.queryKey[0] === "fsQ-authed-api",
		});
		if (!session.jwtExists) {
			throw new Error(
				"Could not authenticate with the server. Try unlocking your session again.",
			);
		}
		session.ensureJwt();
		const profile = await fetchUserProfile(rpc);
		if (!profile.encryptionPublicKey?.trim()) {
			throw new Error("Missing recipient encryption key");
		}
		return profile.encryptionPublicKey as Hex;
	}, [rpc, session, queryClient]);

	const ensureLoggedInForUnlock = useCallback(async () => {
		if (!authenticated) {
			await login();
			throw new Error("PRIVY_LOGIN_STARTED");
		}
		if (isRegistered.data === false) {
			throw new Error("REDIRECTING_TO_ONBOARDING");
		}
		if (!isLoggedIn.data) {
			throw new Error(
				"Wait for your wallet session to finish unlocking, or enter your recovery phrase if prompted.",
			);
		}
	}, [authenticated, login, isRegistered.data, isLoggedIn.data]);

	const submitFilosignRecovery = useCallback(async () => {
		if (!filosignRecoveryPhrase.trim()) return;
		setDecryptError(null);
		try {
			await recoverWithPhrase.mutateAsync({
				phrase: filosignRecoveryPhrase,
			});
			await queryClient.invalidateQueries({
				queryKey: ["fsQ-is-logged-in", wallet?.account.address],
			});
			await queryClient.refetchQueries({
				predicate: (q) =>
					Array.isArray(q.queryKey) && q.queryKey[0] === "fsQ-is-logged-in",
			});
			setShowFilosignRecovery(false);
			setFilosignRecoveryPhrase("");
			toast.success("Session unlocked");
		} catch (e) {
			const msg =
				e instanceof Error
					? e.message.includes("unlock") || e.message.includes("phrase")
						? "Invalid recovery phrase"
						: e.message
					: "Could not unlock with this phrase";
			setDecryptError(msg);
			toast.error(msg);
		}
	}, [
		filosignRecoveryPhrase,
		recoverWithPhrase,
		queryClient,
		wallet?.account.address,
	]);

	const handleUnlockDocument = useCallback(async () => {
		if (!invite || !phrase.trim()) {
			toast.error("Enter the six-word passphrase the sender shared with you.");
			return;
		}
		if (wizardPanel !== "passphrase") {
			toast.error("Finish signing in before unlocking the document.");
			return;
		}
		if (shouldSwitchAccountPrompt) {
			toast.error(
				"Only the invited email can open this document. Switch account or sign in with that address.",
			);
			return;
		}

		const normalizedPhrase = normalizeColdInvitePhrase(phrase);
		const wc = normalizedPhrase.split("-").filter(Boolean).length;
		if (wc !== 6) {
			toast.error(
				`Passphrase must be exactly six hyphen-separated words (${wc} detected).`,
			);
			return;
		}

		setDecryptError(null);
		try {
			await ensureLoggedInForUnlock();

			const recipientEncryptionPk = await resolveRecipientEncryptionKey();

			const result = await coldDecrypt.mutateAsync({
				phrase: normalizedPhrase,
				wrappedEncryptionKey: invite.wrappedEncryptionKey as Hex,
				downloadUrl: invite.downloadUrl,
			});

			await claimWithWalletWrap(result.encryptionKey, recipientEncryptionPk);
			setClaimSucceeded(true);

			void queryClient.invalidateQueries({ queryKey: ["user"] });
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.files.piece.detail.key({
					input: { pieceCid },
				}),
			});

			navigate({
				to: "/dashboard/document/sign",
				search: { pieceCid, invite: "" },
				replace: true,
			} as never);

			toast.success("Document unlocked and secured to your wallet");
		} catch (e) {
			if (e instanceof Error && e.message === "PRIVY_LOGIN_STARTED") return;
			if (e instanceof Error && e.message === "REDIRECTING_TO_ONBOARDING")
				return;
			const msg =
				e instanceof Error ? e.message : "Could not unlock this document";
			setDecryptError(msg);
			toast.error(msg || "Invalid passphrase or corrupted document");
		}
	}, [
		invite,
		phrase,
		wizardPanel,
		shouldSwitchAccountPrompt,
		ensureLoggedInForUnlock,
		resolveRecipientEncryptionKey,
		coldDecrypt,
		claimWithWalletWrap,
		queryClient,
		rpcQuery.files.piece.detail,
		pieceCid,
		navigate,
	]);

	return {
		active,
		ready,
		isLoading: active && isLoading,
		error: active ? error : null,
		invite: active ? invite : undefined,
		claimSucceeded,
		wizardPanel: active ? wizardPanel : null,
		phrase,
		setPhrase,
		filosignRecoveryPhrase,
		setFilosignRecoveryPhrase,
		decryptError,
		phraseWordCount,
		shouldSwitchAccountPrompt,
		signedInEmailForUi,
		submitFilosignRecovery,
		isFilosignRecoveryPending: recoverWithPhrase.isPending,
		handleUnlockDocument,
		runSwitchAccount,
		resetWizardAfterSwitchAccount,
		coldDecrypt,
		claimColdInvite,
	};
}

export type SignInviteUnlockController = ReturnType<typeof useSignInviteUnlock>;
