import { motion, PresenceSwap, SPRING_TOKENS } from "@filosign/motion";
import { useIsRegistered } from "@filosign/react/auth";
import { SignOutIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/src/lib/components/ui/button";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

type ConnectButtonState = "loading" | "signin" | "get-started" | "dashboard";

export default function ConnectButton() {
	const { ready, authenticated, logout, login } = useThirdweb();
	const isRegistered = useIsRegistered();

	const buttonState: ConnectButtonState = !ready
		? "loading"
		: !authenticated || isRegistered.isPending
			? "signin"
			: !isRegistered.data
				? "get-started"
				: "dashboard";

	const isLoading = buttonState === "loading";
	const primaryCta =
		buttonState === "dashboard"
			? { label: "Dashboard", to: "/dashboard" as const }
			: buttonState === "get-started"
				? { label: "Get started", to: "/onboarding" as const }
				: null;

	return (
		<motion.div
			className="flex items-center gap-2"
			initial={{ opacity: 0, x: 30 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{
				...SPRING_TOKENS.smoothHeavy,
				delay: 0.78,
			}}
		>
			{(!authenticated || isLoading) && buttonState !== "dashboard" ? (
				<Button
					variant="secondary"
					onClick={
						buttonState === "signin" && !isLoading
							? () => void login()
							: undefined
					}
					disabled={isLoading}
					className="min-w-28"
				>
					<PresenceSwap customKey={buttonState} layout>
						<span>Sign in</span>
					</PresenceSwap>
				</Button>
			) : null}

			{primaryCta ? (
				<Button
					variant="secondary"
					className="min-w-28 mr-2"
					render={<Link to={primaryCta.to} />}
				>
					<PresenceSwap customKey={primaryCta.to} layout>
						<span>{primaryCta.label}</span>
					</PresenceSwap>
				</Button>
			) : null}

			{authenticated ? (
				<Button
					variant="secondary"
					size="icon"
					onClick={() => void logout()}
					title="Logout"
				>
					<SignOutIcon className="h-5 w-5" />
				</Button>
			) : null}
		</motion.div>
	);
}
