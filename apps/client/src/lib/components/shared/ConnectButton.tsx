import { SignOutIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";
import { useConnectButtonLogic } from "@/src/lib/hooks/use-connect-button-logic";

export default function ConnectButton() {
	const { authenticated, isLoading, buttonState, primaryCta, signIn, logout } =
		useConnectButtonLogic();

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
			{/* Sign In button - show when not authenticated or loading */}
			{(!authenticated || isLoading) && buttonState !== "dashboard" ? (
				<Button
					variant="secondary"
					onClick={
						buttonState === "signin" && !isLoading ? () => signIn() : undefined
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

			{/* Get started / Dashboard buttons */}
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

			{/* Logout button - show when authenticated */}
			{authenticated && (
				<Button
					variant="secondary"
					size="icon"
					onClick={() => logout()}
					title="Logout"
				>
					<SignOutIcon className="h-5 w-5" />
				</Button>
			)}
		</motion.div>
	);
}
