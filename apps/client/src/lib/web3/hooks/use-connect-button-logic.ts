import { useIsRegistered } from "@filosign/react/auth";
import { useThirdwebLogin } from "@/src/lib/web3/hooks/use-thirdweb-login";
import { useThirdwebWalletAuth } from "@/src/lib/web3/hooks/use-thirdweb-wallet-auth";

export type ConnectButtonState =
	| "loading"
	| "signin"
	| "get-started"
	| "dashboard";

export function useConnectButtonLogic() {
	const { ready, authenticated, logout } = useThirdwebWalletAuth();
	const { login } = useThirdwebLogin();
	const isRegistered = useIsRegistered();

	const getButtonState = (): ConnectButtonState => {
		if (!ready) return "loading";
		if (!authenticated || isRegistered.isPending) return "signin";
		if (!isRegistered.data) return "get-started";
		return "dashboard";
	};

	const buttonState = getButtonState();
	const isLoading = buttonState === "loading";

	const primaryCta =
		buttonState === "dashboard"
			? { label: "Dashboard", to: "/dashboard" }
			: buttonState === "get-started"
				? { label: "Get started", to: "/onboarding" }
				: null;

	return {
		ready,
		authenticated,
		isLoading,
		buttonState,
		primaryCta,
		signIn: () => void login(),
		logout: () => void logout(),
	} as const;
}
