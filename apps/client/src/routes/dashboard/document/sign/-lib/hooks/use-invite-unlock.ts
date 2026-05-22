import { normalizeColdInvitePhrase } from "@filosign/crypto-utils";
import { useFilosignContext } from "@filosign/react";
import {
	useIsLoggedIn,
	useIsRegistered,
	useLogout,
} from "@filosign/react/auth";
import {
	useClaimColdInvite,
	useColdInviteDecrypt,
	useColdInvitePayload,
} from "@filosign/react/files";
import { invalidateUserProfile } from "@filosign/react/invalidate-queries";
import {
	filosignNonRpcRoots,
	queryKeyHasNonRpcRoot,
} from "@filosign/react/query-keys";
import { fetchUserProfile, useUserProfile } from "@filosign/react/users";
import { buildClaimKemPayload } from "@filosign/react/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getAddress, type Hex } from "viem";
import { useWalletUnlock } from "@/src/lib/auth/use-wallet-unlock";
import { coldInviteRecipientMatchesIdentity } from "@/src/lib/domains/invites/cold-invite-search";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import {
	useThirdweb,
	useThirdwebLoginAction,
} from "@/src/lib/web3/use-thirdweb";
import { executeSwitchAccountLogout } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";

export function useSignInviteUnlock(args: {
	pieceCid: string;
	inviteToken: string;
}) {
	const { pieceCid, inviteToken } = args;
	const active = Boolean(inviteToken.trim());
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { rpc, session, wallet, rpcQuery } = useFilosignContext();
	const { ready, authenticated, user, logout: logoutWallet } = useThirdweb();
	const login = useThirdwebLoginAction();
	const { data: userProfile } = useUserProfile();
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

	const walletUnlock = useWalletUnlock({
		enabled:
			active &&
			ready &&
			authenticated &&
			isRegistered.data === true &&
			!isRegistered.isPending,
	});

	const [phrase, setPhrase] = useState("");
	const [claimSucceeded, setClaimSucceeded] = useState(false);
	const [decryptError, setDecryptError] = useState<string | null>(null);
	const autoWalletLoginRef = useRef(false);

	const showFilosignRecovery = walletUnlock.showRecoveryGate;
	const tryingWalletUnlock = walletUnlock.tryingWalletUnlock;
	const filosignRecoveryPhrase = walletUnlock.recoveryPhrase;
	const setFilosignRecoveryPhrase = walletUnlock.setRecoveryPhrase;

	const resetWizardAfterSwitchAccount = useCallback(() => {
		setPhrase("");
		walletUnlock.setRecoveryPhrase("");
		setDecryptError(null);
		walletUnlock.resetRecoveryGate();
		autoWalletLoginRef.current = false;
	}, [walletUnlock]);

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
				queryKeyHasNonRpcRoot(q.queryKey, filosignNonRpcRoots.authedApi),
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
		// rpc is a stable Filosign proxy; omit from deps to avoid effect churn
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session, queryClient]);

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
			await walletUnlock.handleRecover();
			await queryClient.refetchQueries({
				predicate: (q) =>
					queryKeyHasNonRpcRoot(q.queryKey, filosignNonRpcRoots.isLoggedIn),
			});
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
	}, [filosignRecoveryPhrase, walletUnlock, queryClient]);

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

			void invalidateUserProfile(queryClient, rpcQuery);
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
		isFilosignRecoveryPending: walletUnlock.recoverWithPhrase.isPending,
		handleUnlockDocument,
		runSwitchAccount,
		resetWizardAfterSwitchAccount,
		coldDecrypt,
		claimColdInvite,
	};
}

export type SignInviteUnlockController = ReturnType<typeof useSignInviteUnlock>;
