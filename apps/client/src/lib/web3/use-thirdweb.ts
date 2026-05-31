import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
	useIdentifyAnalyticsWallet,
} from "@filosign/react/analytics";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { viemAdapter } from "thirdweb/adapters/viem";
import {
	useActiveAccount,
	useActiveWallet,
	useActiveWalletChain,
	useActiveWalletConnectionStatus,
	useConnectModal,
	useDisconnect,
	useProfiles,
	useWalletDetailsModal,
} from "thirdweb/react";
import type { Profile } from "thirdweb/wallets";
import type { WalletClient } from "viem";
import { useTheme } from "@/src/lib/components/ui/theme-provider";
import { clientSignupPolicyIsGated } from "@/src/lib/deployment";
import {
	defaultThirdwebChain,
	thirdwebClient,
	thirdwebConnectModalOptions,
	thirdwebWalletModalOptions,
} from "@/src/lib/web3/config";
import { clearStoredAccessGate } from "@/src/lib/web3/platform-access-session";

function profileEmailsFromThirdwebProfiles(profiles: Profile[] | undefined): {
	email: string;
	googleEmail: string;
} {
	let emailFromEmail = "";
	let emailFromGoogle = "";
	let googleEmail = "";
	if (!profiles?.length) {
		return { email: "", googleEmail: "" };
	}

	for (const profile of profiles) {
		const trimmed = profile.details.email?.trim();
		if (!trimmed) continue;

		if (profile.type === "email" && !emailFromEmail) {
			emailFromEmail = trimmed;
		} else if (profile.type === "google") {
			if (!googleEmail) googleEmail = trimmed;
			if (!emailFromGoogle) emailFromGoogle = trimmed;
		}
	}

	return {
		email: emailFromEmail || emailFromGoogle,
		googleEmail,
	};
}

/** thirdweb in-app wallet: connection state, viem client for SDK, login/logout, top-up. */
export function useThirdweb() {
	const status = useActiveWalletConnectionStatus();
	const ready = status !== "connecting";
	const authenticated = status === "connected";
	const isConnecting = status === "connecting";

	const { resolvedTheme } = useTheme();

	const account = useActiveAccount();
	const activeWallet = useActiveWallet();
	const activeChain = useActiveWalletChain();
	const { data: profiles } = useProfiles({ client: thirdwebClient });
	const { connect: openConnectModal } = useConnectModal();
	const detailsModal = useWalletDetailsModal();
	const { disconnect } = useDisconnect();

	const captureAppEvent = useCaptureAppEvent();
	const identifyAnalyticsWallet = useIdentifyAnalyticsWallet();

	const chain = activeChain ?? defaultThirdwebChain;
	const viemWalletQuery = useQuery({
		queryKey: [
			"thirdweb-viem-wallet",
			activeWallet?.id,
			chain.id,
			account?.address,
		] as const,
		enabled: authenticated && Boolean(activeWallet && account?.address),
		queryFn: async (): Promise<WalletClient | undefined> => {
			if (!activeWallet) return undefined;
			return viemAdapter.wallet.toViem({
				wallet: activeWallet,
				client: thirdwebClient,
				chain,
			});
		},
		staleTime: Number.POSITIVE_INFINITY,
	});

	const viemWallet = viemWalletQuery.data;

	const { email, googleEmail } = useMemo(
		() => profileEmailsFromThirdwebProfiles(profiles),
		[profiles],
	);

	const walletAddress = account?.address ?? "";

	const user = useMemo(() => {
		if (!account?.address) return null;
		return {
			wallet: { address: account.address },
			email: email ? { address: email } : undefined,
			google: googleEmail ? { email: googleEmail } : undefined,
		};
	}, [account?.address, email, googleEmail]);

	const login = useCallback(async () => {
		if (clientSignupPolicyIsGated()) {
			throw new Error(
				"Open the link from your email or use the sign-in page to continue.",
			);
		}
		const hadAccount = Boolean(account?.address);
		const wallet = await openConnectModal({
			...thirdwebConnectModalOptions,
			theme: resolvedTheme,
		});
		const address = wallet.getAccount()?.address;
		if (!hadAccount && address) {
			captureAppEvent(CLIENT_ANALYTICS_EVENTS.walletSignup, {});
			identifyAnalyticsWallet(address);
		}
	}, [
		account?.address,
		captureAppEvent,
		identifyAnalyticsWallet,
		openConnectModal,
		resolvedTheme,
	]);

	const logout = useCallback(async () => {
		if (!activeWallet) return;
		clearStoredAccessGate();
		await disconnect(activeWallet);
	}, [activeWallet, disconnect]);

	const openTopUp = useCallback(async () => {
		detailsModal.open({
			...thirdwebWalletModalOptions,
			theme: resolvedTheme,
		});
	}, [detailsModal, resolvedTheme]);

	return {
		ready,
		authenticated,
		isConnecting,
		address: account?.address,
		walletAddress,
		email,
		user,
		viemWallet,
		viemWalletPending: viemWalletQuery.isPending,
		login,
		logout,
		openTopUp,
	} as const;
}

export function useThirdwebLoginAction() {
	const { login } = useThirdweb();
	return useCallback(() => login(), [login]);
}
