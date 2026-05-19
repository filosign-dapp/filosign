import { useFilosignContext } from "@filosign/react";
import { useIsRegistered, useLogout } from "@filosign/react/auth";
import { SpinnerIcon } from "@phosphor-icons/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useWalletClient } from "wagmi";
import env from "@/src/env";
import Logo from "@/src/lib/components/custom/Logo";
import { Button } from "@/src/lib/components/ui/button";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { useThirdwebLogin } from "@/src/lib/hooks/use-thirdweb-login";
import { useThirdwebWalletAuth } from "@/src/lib/hooks/use-thirdweb-wallet-auth";
import { useColdInviteRecipientWarning } from "@/src/lib/hooks/useColdInviteRecipientWarning";
import {
	hasColdReturn,
	signDocumentSearchFromColdEntry,
} from "@/src/lib/routing/cold-invite-search";
import { ColdInviteNotForYouCallout } from "@/src/pages/onboarding/_components/ColdInviteNotForYouCallout";
import {
	executeSwitchAccountLogout,
	OnboardingSwitchAccountLink,
} from "@/src/pages/onboarding/_components/OnboardingSwitchAccountLink";

export default function SignInPage() {
	const {
		ready,
		authenticated,
		logout: logoutWallet,
	} = useThirdwebWalletAuth();
	const { login } = useThirdwebLogin();
	const { data: walletClient } = useWalletClient();
	const { wallet } = useFilosignContext();
	const logoutFilosign = useLogout();
	const clearOnboardingForm = useStorePersist((s) => s.clearOnboardingForm);
	const isRegistered = useIsRegistered();
	const navigate = useNavigate();
	const [switchAccountPending, setSwitchAccountPending] = useState(false);
	const coldSearch = useSearch({ from: "/" });
	const coldReturn = useMemo(
		() => hasColdReturn(coldSearch),
		[coldSearch.coldPieceCid, coldSearch.coldInvite],
	);
	const signSearch = useMemo(
		() => signDocumentSearchFromColdEntry(coldSearch),
		[coldSearch.coldPieceCid, coldSearch.coldInvite, coldSearch.skipColdSign],
	);

	const continueAnywayColdSearch = useMemo(() => {
		if (!coldReturn) return undefined;
		const piece = coldSearch.coldPieceCid?.trim();
		const inv = coldSearch.coldInvite?.trim();
		if (!piece || !inv) return undefined;
		return { coldPieceCid: piece, coldInvite: inv };
	}, [coldReturn, coldSearch.coldPieceCid, coldSearch.coldInvite]);

	const coldInviteWarning = useColdInviteRecipientWarning();
	const showColdInviteMismatch =
		authenticated && coldReturn && coldInviteWarning.showWarning;

	useEffect(() => {
		if (!ready || !authenticated) return;
		if (isRegistered.isPending) return;
		if (isRegistered.data !== true) return;
		if (signSearch) {
			void navigate({
				to: "/dashboard/document/sign",
				search: signSearch,
				replace: true,
			});
			return;
		}
		void navigate({ to: "/dashboard", replace: true });
	}, [
		ready,
		authenticated,
		isRegistered.isPending,
		isRegistered.data,
		navigate,
		signSearch,
	]);

	const thirdwebAddress = useActiveAccount()?.address;
	const walletAddress = walletClient?.account.address ?? thirdwebAddress;
	const walletReady = Boolean(walletAddress);
	const checkingRegistration = walletReady && isRegistered.isLoading;

	const needsAccountSetup =
		authenticated &&
		walletReady &&
		isRegistered.data === false &&
		!checkingRegistration;

	const signingIn = authenticated && (!walletReady || checkingRegistration);
	const registrationCheckFailed =
		authenticated && walletReady && isRegistered.isError;
	const buttonLoading = !ready;

	const handleSwitchAccountFromSignIn = async () => {
		setSwitchAccountPending(true);
		try {
			await executeSwitchAccountLogout({
				clearOnboardingForm,
				wallet,
				logoutFilosign,
				logoutWallet,
				navigate,
				stayAfterLogout: false,
			});
		} finally {
			setSwitchAccountPending(false);
		}
	};

	return (
		<main className="min-h-dvh grid lg:grid-cols-2 bg-background">
			<div className="relative hidden overflow-hidden lg:block">
				<img
					src="/images/stock_1.webp"
					alt=""
					className="absolute inset-0 size-full object-cover"
					width={1920}
					height={1080}
				/>
				<div className="relative z-10 flex h-full flex-col justify-between p-10">
					<Logo
						redirectTo="/"
						className="px-0"
						textClassName="text-foreground"
						textDelay={0}
						iconDelay={0}
					/>
					<blockquote className="max-w-md space-y-3 text-pretty">
						<p className="font-manrope text-xl font-medium leading-snug text-foreground md:text-2xl">
							Envelopes and signatures your team can verify—without chasing
							status in email threads.
						</p>
						<footer className="text-sm text-muted-foreground">
							One workspace for drafts, recipients, and the paper trail when it
							matters.
						</footer>
					</blockquote>
				</div>
			</div>

			<div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14">
				<div className="mx-auto w-full max-w-md space-y-10">
					<Logo
						redirectTo="/"
						className="px-0"
						textClassName="text-foreground"
						textDelay={0}
						iconDelay={0}
					/>

					{registrationCheckFailed ? (
						<div className="flex flex-col items-center gap-4 py-8 text-center">
							<p className="font-medium text-foreground">
								Could not verify your account
							</p>
							<p className="text-sm text-muted-foreground">
								Check your connection and that contracts are deployed for this
								network, then try again.
							</p>
							<Button
								type="button"
								variant="outline"
								onClick={() => void isRegistered.refetch()}
							>
								Retry
							</Button>
						</div>
					) : signingIn ? (
						<div className="flex flex-col items-center gap-4 py-8 text-center">
							{showColdInviteMismatch ? (
								<>
									<ColdInviteNotForYouCallout
										className="w-full max-w-md text-left"
										recipientEmails={coldInviteWarning.recipientEmails}
										signedInEmailForUi={coldInviteWarning.signedInEmailForUi}
									/>
									<OnboardingSwitchAccountLink
										className="w-full max-w-md"
										coldInviteMismatch={showColdInviteMismatch}
										continueAnywayColdSearch={continueAnywayColdSearch}
									/>
								</>
							) : null}
							<SpinnerIcon
								className="size-10 animate-spin text-muted-foreground"
								aria-hidden
							/>
							<div className="space-y-1">
								<p className="font-medium text-foreground">Signing you in…</p>
								<p className="text-sm text-muted-foreground">
									Connecting your wallet and checking your Filosign account.
								</p>
							</div>
						</div>
					) : needsAccountSetup ? (
						<div className="">
							<div className="space-y-2">
								<h1 className="font-manrope text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
									Almost there
								</h1>
								<p className="text-muted-foreground">
									{coldReturn
										? "Finish onboarding to sign the document."
										: "Finish onboarding so you can send and sign envelopes."}
								</p>
							</div>
							<div className="mt-8 flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-xs">
								{showColdInviteMismatch ? (
									<ColdInviteNotForYouCallout
										embedded
										className="border-b border-border pb-4"
										recipientEmails={coldInviteWarning.recipientEmails}
										signedInEmailForUi={coldInviteWarning.signedInEmailForUi}
									/>
								) : (
									<div className="border-b border-border pb-4 text-left">
										<p className="font-manrope font-semibold tracking-tight text-foreground">
											Finish setting up your account
										</p>
										<p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
											Setting up your account will take less than a minute.
										</p>
									</div>
								)}
								<Button
									type="button"
									variant="default"
									size="lg"
									className="w-full"
									disabled={
										showColdInviteMismatch ? switchAccountPending : false
									}
									isLoading={
										showColdInviteMismatch ? switchAccountPending : false
									}
									onClick={() =>
										showColdInviteMismatch
											? void handleSwitchAccountFromSignIn()
											: void navigate({
													to: "/onboarding",
													...(coldReturn
														? {
																search: {
																	coldPieceCid: coldSearch.coldPieceCid,
																	coldInvite: coldSearch.coldInvite,
																},
															}
														: {}),
												})
									}
								>
									{showColdInviteMismatch
										? "Switch account"
										: "Continue to onboarding"}
								</Button>
							</div>
							{showColdInviteMismatch ? (
								<OnboardingSwitchAccountLink
									className="mt-6"
									coldInviteMismatch
									continueAnywayColdSearch={continueAnywayColdSearch}
								/>
							) : (
								<OnboardingSwitchAccountLink />
							)}
						</div>
					) : (
						<div className="space-y-8">
							<div className="space-y-2">
								<h1 className="font-manrope text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
									Welcome to Filosign
								</h1>
								<p className="text-muted-foreground">
									Send envelopes, collect signatures, and keep a clear record
									when deals close.
								</p>
							</div>

							<div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-xs">
								<div className="border-b border-border pb-4 text-left">
									<p className="font-manrope font-semibold tracking-tight text-foreground">
										Login to Filosign
									</p>
									<p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
										Continue with your email or social account.
									</p>
								</div>
								<Button
									type="button"
									variant="default"
									size="lg"
									className="w-full"
									disabled={buttonLoading}
									isLoading={buttonLoading}
									onClick={() => login()}
								>
									Sign in
								</Button>
								<p className="text-center text-xs text-muted-foreground">
									By continuing you agree to Filosign&apos;s terms and privacy
									practices.
								</p>
							</div>

							<p className="text-center text-sm text-muted-foreground">
								New to Filosign?{" "}
								<a
									href={env.VITE_ASTRO_URL}
									target="_blank"
									rel="noopener noreferrer"
									className="font-medium text-primary underline-offset-4 hover:underline"
								>
									Learn more on our site
								</a>
							</p>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
