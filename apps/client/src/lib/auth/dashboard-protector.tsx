import { useFilosignContext } from "@filosign/react";
import { useIdentifyAnalyticsWallet } from "@filosign/react/analytics";
import {
	LOGIN_RECOVERY_PHRASE_REQUIRED,
	useIsLoggedIn,
	useIsRegistered,
	useLogin,
	useRecoverWithPhrase,
} from "@filosign/react/auth";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Button } from "@/src/lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import { Label } from "@/src/lib/components/ui/label";
import { Loader } from "@/src/lib/components/ui/loader";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { useThirdwebWalletAuth } from "@/src/lib/web3/hooks/use-thirdweb-wallet-auth";

interface DashboardProtectorProps {
	children: React.ReactNode;
}

export default function DashboardProtector({
	children,
}: DashboardProtectorProps) {
	const { ready, authenticated } = useThirdwebWalletAuth();
	const { wallet } = useFilosignContext();
	const isRegistered = useIsRegistered();
	const isLoggedIn = useIsLoggedIn();
	const login = useLogin();
	const recoverWithPhrase = useRecoverWithPhrase();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const [showRecoveryGate, setShowRecoveryGate] = useState(false);
	const [recoveryPhrase, setRecoveryPhrase] = useState("");
	const [error, setError] = useState("");
	const [tryingWalletUnlock, setTryingWalletUnlock] = useState(false);
	const walletUnlockStartedRef = useRef(false);
	const identifyAnalyticsWallet = useIdentifyAnalyticsWallet();

	useEffect(() => {
		if (isLoggedIn && wallet?.account?.address) {
			identifyAnalyticsWallet(wallet.account.address);
		}
	}, [isLoggedIn, wallet?.account?.address, identifyAnalyticsWallet]);

	useEffect(() => {
		if (isLoggedIn.data) {
			setShowRecoveryGate(false);
			setRecoveryPhrase("");
			setError("");
			walletUnlockStartedRef.current = false;
			return;
		}

		if (
			ready &&
			(!authenticated || !isRegistered.data) &&
			!isRegistered.isPending
		) {
			navigate({ to: "/" });
		}
	}, [
		ready,
		authenticated,
		isRegistered.data,
		isLoggedIn.data,
		navigate,
		isRegistered.isPending,
	]);

	useEffect(() => {
		if (isLoggedIn.data) {
			return;
		}

		const canTryWallet =
			ready &&
			authenticated &&
			isRegistered.data &&
			!isRegistered.isPending &&
			!isLoggedIn.data &&
			!isLoggedIn.isPending;

		if (!canTryWallet) {
			walletUnlockStartedRef.current = false;
			return;
		}

		if (walletUnlockStartedRef.current) {
			return;
		}
		walletUnlockStartedRef.current = true;
		setTryingWalletUnlock(true);

		void login
			.mutateAsync({})
			.catch((err: unknown) => {
				if (
					err instanceof Error &&
					err.message === LOGIN_RECOVERY_PHRASE_REQUIRED
				) {
					setShowRecoveryGate(true);
					return;
				}
				toast.error(
					err instanceof Error ? err.message : "Could not unlock session",
				);
				setShowRecoveryGate(true);
			})
			.finally(() => {
				setTryingWalletUnlock(false);
			});
	}, [
		ready,
		authenticated,
		isRegistered.data,
		isRegistered.isPending,
		isLoggedIn.data,
		isLoggedIn.isPending,
		login,
	]);

	const handleRecover = async () => {
		if (!recoveryPhrase.trim()) return;
		try {
			setError("");
			await recoverWithPhrase.mutateAsync({
				phrase: recoveryPhrase,
			});
			await queryClient.invalidateQueries({
				queryKey: ["fsQ-is-registered", wallet?.account.address],
			});
			await queryClient.invalidateQueries({
				queryKey: ["fsQ-is-logged-in", wallet?.account.address],
			});
			setShowRecoveryGate(false);
			setRecoveryPhrase("");
			toast.success("Session unlocked");
		} catch (recoverErr) {
			const errorMessage =
				recoverErr instanceof Error
					? recoverErr.message.includes("phrase") ||
						recoverErr.message.includes("recovery") ||
						recoverErr.message.includes("Invalid") ||
						recoverErr.message.includes("unlock")
						? "Invalid recovery phrase"
						: recoverErr.message.includes("network") ||
								recoverErr.message.includes("fetch")
							? "Network error - please try again"
							: recoverErr.message.includes("server") ||
									recoverErr.message.includes("500")
								? "Server error - please try again later"
								: recoverErr.message
					: "Recovery failed";
			setError(errorMessage);
		}
	};

	const handleCancel = () => {
		setRecoveryPhrase("");
		setError("");
		walletUnlockStartedRef.current = false;
		navigate({ to: "/" });
	};

	const shouldShowLoader =
		!ready ||
		isRegistered.isPending ||
		tryingWalletUnlock ||
		(!isLoggedIn.data && isLoggedIn.isPending && !isLoggedIn.isError);

	if (shouldShowLoader) {
		return <Loader />;
	}

	if (showRecoveryGate) {
		return (
			<div className="flex justify-center items-center min-h-screen bg-background">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.2 }}
					className="flex flex-col justify-center items-center px-8 mx-auto"
				>
					<Logo
						className="mb-4"
						textClassName="text-foreground font-semibold"
					/>
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3, delay: 0.2 }}
						className="flex flex-col justify-center items-center mx-auto w-full"
					>
						<Card className="w-full">
							<CardHeader>
								<CardTitle>Recover with phrase</CardTitle>
								<CardDescription>
									Your wallet could not unlock this session automatically. Enter
									your 24-word Filosign recovery phrase.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2 w-full min-w-sm max-w-sm">
									<Label htmlFor="dashboard-recovery-phrase">
										Recovery phrase
									</Label>
									<Textarea
										id="dashboard-recovery-phrase"
										value={recoveryPhrase}
										onChange={(event) => setRecoveryPhrase(event.target.value)}
										placeholder="24-word recovery phrase"
										rows={6}
									/>
								</div>

								{error && (
									<p className="text-destructive text-sm text-center">
										{error}
									</p>
								)}

								<div className="flex gap-3">
									<Button
										variant="ghost"
										onClick={handleCancel}
										className="flex-1"
										disabled={login.isPending || recoverWithPhrase.isPending}
									>
										Cancel
									</Button>

									<Button
										onClick={() => void handleRecover()}
										disabled={
											!recoveryPhrase.trim() || recoverWithPhrase.isPending
										}
										className="flex-1 group"
										variant="primary"
									>
										{recoverWithPhrase.isPending
											? "Recovering…"
											: "Unlock session"}
										{!recoverWithPhrase.isPending && (
											<CaretRightIcon
												className="transition-transform duration-200 size-4 group-hover:translate-x-1"
												weight="bold"
											/>
										)}
									</Button>
								</div>
							</CardContent>
						</Card>
					</motion.div>
				</motion.div>
			</div>
		);
	}

	return <>{children}</>;
}
