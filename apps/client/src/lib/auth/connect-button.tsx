import { useIsRegistered } from "@filosign/react/auth";
import { SignOutIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
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
				type: "spring",
				stiffness: 230,
				damping: 30,
				mass: 1.2,
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
					<AnimatePresence mode="wait">
						<motion.span
							key={buttonState}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{
								duration: 0.2,
								ease: "easeInOut",
								layout: { duration: 0.3 },
							}}
							layout
						>
							Sign in
						</motion.span>
					</AnimatePresence>
				</Button>
			) : null}

			{primaryCta ? (
				<Button
					variant="secondary"
					className="min-w-28 mr-2"
					render={<Link to={primaryCta.to} />}
				>
					<AnimatePresence mode="wait">
						<motion.span
							key={primaryCta.to}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{
								duration: 0.2,
								ease: "easeInOut",
								layout: { duration: 0.3 },
							}}
							layout
						>
							{primaryCta.label}
						</motion.span>
					</AnimatePresence>
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
