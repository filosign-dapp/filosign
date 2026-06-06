import { normalizeColdInvitePhrase } from "@filosign/crypto-utils";
import { useFilosignContext } from "@filosign/react";
import {
	useCryptoUnlocked,
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
import { getAddress, type Hex } from "viem";
import { useAutoRegisterOptional } from "@/src/lib/auth/auto-register-provider";
import { useCryptoRequired } from "@/src/lib/auth/use-crypto-required";
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
	const autoRegister = useAutoRegisterOptional();
	const apiSession = useIsLoggedIn();
	const cryptoUnlocked = useCryptoUnlocked();
	const {
		data: invite,
		isLoading,
		error,
	} = useColdInvitePayload(active ? inviteToken : undefined);
	const coldDecrypt = useColdInviteDecrypt();
	const claimColdInvite = useClaimColdInvite();
	const cryptoRequired = useCryptoRequired({
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

	const showFilosignRecovery = cryptoRequired.needsRecovery;
	const tryingWalletUnlock = cryptoRequired.tryingWalletUnlock;
	const filosignRecoveryPhrase = cryptoRequired.recoveryPhrase;
	const setFilosignRecoveryPhrase = cryptoRequired.setRecoveryPhrase;

	const autoRegisterStatus = autoRegister?.status.status ?? "idle";
	const autoRegisterBlocking = autoRegister?.isBlocking ?? false;
	const autoRegisterFailed = autoRegisterStatus === "failed";

	const resetWizardAfterSwitchAccount = useCallback(() => {
		setPhrase("");
		cryptoRequired.setRecoveryPhrase("");
		setDecryptError(null);
		cryptoRequired.resetRecovery();
		autoWalletLoginRef.current = false;
	}, [cryptoRequired]);

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

	const wizardPanel = useMemo(() => {
		if (!active || !invite) return null;
		if (!authenticated) return "signingIn" as const;
		if (autoRegisterFailed) return "setupFailed" as const;
		if (
			autoRegisterBlocking ||
			isRegistered.isPending ||
			autoRegisterStatus !== "completed"
		) {
			return "settingUpAccount" as const;
		}
		if (apiSession.isPending || cryptoUnlocked.isPending) {
			return "busy" as const;
		}
		if (isRegistered.data === false) return "settingUpAccount" as const;
		if (!apiSession.data) return "busy" as const;
		if (!cryptoUnlocked.data && showFilosignRecovery)
			return "filosignRecovery" as const;
		if (!cryptoUnlocked.data && tryingWalletUnlock) return "unlocking" as const;
		if (!cryptoUnlocked.data) return "busy" as const;
		return "passphrase" as const;
	}, [
		active,
		invite,
		authenticated,
		autoRegisterFailed,
		autoRegisterBlocking,
		autoRegisterStatus,
		isRegistered.isPending,
		isRegistered.data,
		apiSession.isPending,
		apiSession.data,
		cryptoUnlocked.isPending,
		cryptoUnlocked.data,
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
		if (!session.hasThirdwebSession()) {
			throw new Error(
				"Could not authenticate with the server. Sign in with your wallet again.",
			);
		}
		const profile = await fetchUserProfile(rpc);
		if (!profile.encryptionPublicKey?.trim()) {
			throw new Error("Missing recipient encryption key");
		}
		return profile.encryptionPublicKey;
		// rpc is a stable Filosign proxy; omit from deps to avoid effect churn
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session, queryClient]);

	const ensureLoggedInForUnlock = useCallback(async () => {
		if (!authenticated) {
			await login();
			throw new Error("AUTH_LOGIN_STARTED");
		}
		if (autoRegisterBlocking || autoRegisterStatus !== "completed") {
			throw new Error("ACCOUNT_SETUP_IN_PROGRESS");
		}
		if (isRegistered.data === false) {
			throw new Error("ACCOUNT_SETUP_IN_PROGRESS");
		}
		if (!apiSession.data) {
			throw new Error("Wait for your wallet session to connect to Filosign.");
		}
		if (!cryptoUnlocked.data) {
			throw new Error(
				"Unlock your encryption keys (wallet sign or recovery phrase) to continue.",
			);
		}
	}, [
		authenticated,
		login,
		autoRegisterBlocking,
		autoRegisterStatus,
		isRegistered.data,
		apiSession.data,
		cryptoUnlocked.data,
	]);

	const submitFilosignRecovery = useCallback(async () => {
		if (!filosignRecoveryPhrase.trim()) return;
		setDecryptError(null);
		try {
			await cryptoRequired.submitRecovery();
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
	}, [filosignRecoveryPhrase, cryptoRequired, queryClient]);

	const handleUnlockDocument = useCallback(async () => {
		if (!invite || !phrase.trim()) {
			return;
		}
		if (wizardPanel !== "passphrase") {
			return;
		}
		if (shouldSwitchAccountPrompt) {
			setDecryptError(
				"Only the invited email can open this document. Switch account or sign in with that address.",
			);
			return;
		}

		const normalizedPhrase = normalizeColdInvitePhrase(phrase);
		const wc = normalizedPhrase.split("-").filter(Boolean).length;
		if (wc !== 6) {
			setDecryptError(
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
				wrappedEncryptionKey: invite.wrappedEncryptionKey,
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
			});
		} catch (e) {
			if (e instanceof Error && e.message === "AUTH_LOGIN_STARTED") return;
			if (e instanceof Error && e.message === "ACCOUNT_SETUP_IN_PROGRESS")
				return;
			const msg =
				e instanceof Error ? e.message : "Could not unlock this document";
			setDecryptError(msg);
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
		isFilosignRecoveryPending: cryptoRequired.recoveryPending,
		handleUnlockDocument,
		runSwitchAccount,
		resetWizardAfterSwitchAccount,
		retryAutoRegister: autoRegister?.retry,
		autoRegisterError:
			autoRegister?.status.status === "failed"
				? autoRegister.status.error
				: null,
		coldDecrypt,
		claimColdInvite,
	};
}

export type SignInviteUnlockController = ReturnType<typeof useSignInviteUnlock>;
