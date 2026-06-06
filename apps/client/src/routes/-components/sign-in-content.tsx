import { SpinnerIcon } from "@phosphor-icons/react";
import env from "@/src/env";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Button } from "@/src/lib/components/ui/button";
import { SignInOtpDialog } from "@/src/routes/-components/sign-in-otp-dialog";
import { useSignIn } from "@/src/routes/-lib/context/sign-in-context";
import { ColdInviteNotForYouCallout } from "@/src/routes/onboarding/-components/ColdInviteNotForYouCallout";
import { OnboardingSwitchAccountLink } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";

function SignInTermsFooter() {
	return (
		<p className="text-center text-xs text-muted-foreground">
			By continuing you agree to Filosign&apos;s{" "}
			<a
				href={`${env.VITE_ASTRO_URL.replace(/\/$/, "")}/terms`}
				target="_blank"
				rel="noopener noreferrer"
				className="underline underline-offset-2 hover:text-foreground"
			>
				Terms of Service
			</a>{" "}
			and{" "}
			<a
				href={`${env.VITE_ASTRO_URL.replace(/\/$/, "")}/privacy`}
				target="_blank"
				rel="noopener noreferrer"
				className="underline underline-offset-2 hover:text-foreground"
			>
				Privacy Policy
			</a>
			.
		</p>
	);
}

function gatedCardSubtitle(args: {
	isReturningUser: boolean;
	isAdminBootstrap: boolean;
	isPaidSetup: boolean;
	planLabel: string | null;
	effectiveEmail: string;
	needsEmailInput: boolean;
}) {
	if (args.isAdminBootstrap && args.effectiveEmail) {
		return (
			<>
				Setting up{" "}
				<span className="font-medium text-foreground">
					{args.planLabel ?? "Teams Pro"}
				</span>
				. We&apos;ll send a verification code to{" "}
				<span className="font-medium text-foreground">
					{args.effectiveEmail}
				</span>
				.
			</>
		);
	}
	if (args.isReturningUser && args.effectiveEmail) {
		return (
			<>
				We&apos;ll send a sign-in code to{" "}
				<span className="font-medium text-foreground">
					{args.effectiveEmail}
				</span>
				.
			</>
		);
	}
	if (args.isPaidSetup && args.planLabel && args.effectiveEmail) {
		return (
			<>
				Your{" "}
				<span className="font-medium text-foreground">{args.planLabel}</span>{" "}
				subscription is active. We emailed setup instructions to{" "}
				<span className="font-medium text-foreground">
					{args.effectiveEmail}
				</span>
				. Click below to verify your email and finish sign up.
			</>
		);
	}
	if (args.planLabel && args.effectiveEmail) {
		return (
			<>
				Setting up{" "}
				<span className="font-medium text-foreground">{args.planLabel}</span>.
				We&apos;ll send a verification code to{" "}
				<span className="font-medium text-foreground">
					{args.effectiveEmail}
				</span>
				.
			</>
		);
	}
	if (args.planLabel) {
		return (
			<>
				Setting up{" "}
				<span className="font-medium text-foreground">{args.planLabel}</span>.
				Click below and we&apos;ll email you a verification code.
			</>
		);
	}
	if (args.effectiveEmail) {
		return (
			<>
				We&apos;ll send a verification code to{" "}
				<span className="font-medium text-foreground">
					{args.effectiveEmail}
				</span>
				.
			</>
		);
	}
	if (args.needsEmailInput) {
		return "Click below to enter your email and receive a verification code.";
	}
	return "Click below and we will email you a verification code.";
}

export function SignInContent() {
	const {
		view,
		coldReturn,
		showColdInviteMismatch,
		coldInviteWarning,
		continueAnywayColdSearch,
		buttonLoading,
		isRegistered,
		autoRegisterError,
		retryAutoRegister,
		login,
		signInGate,
	} = useSignIn();

	const pricingUrl = `${env.VITE_ASTRO_URL.replace(/\/$/, "")}/pricing`;

	return (
		<div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14">
			<div className="mx-auto w-full max-w-md space-y-10">
				<Logo
					redirectTo="/"
					className="px-0"
					textClassName="text-foreground"
					textDelay={0}
					iconDelay={0}
				/>

				{view === "registration-failed" || view === "bootstrap-failed" ? (
					<div className="flex flex-col items-center gap-4 py-8 text-center">
						<p className="font-medium text-foreground">
							{view === "bootstrap-failed"
								? "Could not finish setting up your account"
								: "Could not verify your account"}
						</p>
						<p className="text-sm text-muted-foreground">
							{autoRegisterError ??
								"Check your connection and that contracts are deployed for this network, then try again."}
						</p>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								if (retryAutoRegister) {
									void retryAutoRegister();
									return;
								}
								void isRegistered.refetch();
							}}
						>
							Retry
						</Button>
					</div>
				) : view === "auto-registering" ? (
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
							<p className="font-medium text-foreground">
								Setting up your account…
							</p>
							<p className="text-sm text-muted-foreground">
								Creating your Filosign keys and workspace. This usually takes a
								few seconds.
							</p>
						</div>
					</div>
				) : view === "signing-in" ? (
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
				) : (
					<div className="space-y-8">
						<div className="space-y-2">
							<h1 className="font-manrope text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
								Welcome to Filosign
							</h1>
							<p className="text-muted-foreground">
								{coldReturn
									? "Sign in to view and sign your document."
									: "Send envelopes, collect signatures, and keep a clear record when deals close."}
							</p>
						</div>

						{signInGate.gated ? (
							signInGate.gateState.status === "loading" ? (
								<div className="flex flex-col items-center gap-4 py-8">
									<SpinnerIcon
										className="size-10 animate-spin text-muted-foreground"
										aria-hidden
									/>
									<p className="text-sm text-muted-foreground">
										Verifying your access link…
									</p>
								</div>
							) : signInGate.gateState.status === "fetching_setup" ? (
								<div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-xs">
									<div className="border-b border-border pb-4 text-left">
										<p className="font-manrope font-semibold tracking-tight text-foreground">
											Complete sign up
										</p>
										<p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
											Confirming your payment. This usually takes a few seconds.
										</p>
									</div>
									<Button
										type="button"
										variant="default"
										size="lg"
										className="w-full"
										disabled
										isLoading
									>
										Fetching state
									</Button>
									<SignInTermsFooter />
								</div>
							) : signInGate.gateState.status === "blocked" ? (
								<div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-xs">
									<div className="border-b border-border pb-4 text-left">
										<p className="font-manrope font-semibold tracking-tight text-foreground">
											Finish setting up Filosign
										</p>
										<p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
											We are still confirming your payment. Check your email for
											setup instructions. It is sent automatically once payment
											clears.
										</p>
									</div>
									<Button
										type="button"
										variant="default"
										size="lg"
										className="w-full"
										disabled={signInGate.authPending}
										isLoading={signInGate.authPending}
										onClick={() => void signInGate.refetchGate()}
									>
										Try again
									</Button>
									<SignInTermsFooter />
								</div>
							) : signInGate.showLoginHome ? (
								<div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-xs">
									<div className="border-b border-border pb-4 text-left">
										<p className="font-manrope font-semibold tracking-tight text-foreground">
											Sign in to Filosign
										</p>
										<p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
											Sign in with the email on your account.
										</p>
									</div>
									<Button
										type="button"
										variant="default"
										size="lg"
										className="w-full"
										disabled={signInGate.authPending}
										isLoading={signInGate.authPending}
										onClick={() => signInGate.beginLogin()}
									>
										Login
									</Button>
									<p className="text-center text-xs text-muted-foreground">
										New user?{" "}
										<a
											href={pricingUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="font-medium text-primary underline-offset-4 hover:underline"
										>
											Browse our plans here
										</a>
									</p>
									<SignInTermsFooter />
								</div>
							) : (
								<div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-xs">
									<div className="border-b border-border pb-4 text-left">
										<p className="font-manrope font-semibold tracking-tight text-foreground">
											{signInGate.isReturningUser
												? "Sign in to Filosign"
												: "Complete sign up"}
										</p>
										<p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
											{gatedCardSubtitle({
												isReturningUser: signInGate.isReturningUser,
												isAdminBootstrap: signInGate.isAdminBootstrap,
												isPaidSetup:
													signInGate.gateState.status === "ready" &&
													signInGate.gateState.gate === "paid_setup",
												planLabel: signInGate.gateState.planLabel,
												effectiveEmail: signInGate.effectiveEmail,
												needsEmailInput: signInGate.gateState.needsEmailInput,
											})}
										</p>
									</div>
									<Button
										type="button"
										variant="default"
										size="lg"
										className="w-full"
										disabled={signInGate.authPending}
										isLoading={signInGate.authPending}
										onClick={() => void signInGate.beginEmailAuth()}
									>
										{signInGate.isReturningUser
											? "Sign in"
											: signInGate.isAdminBootstrap
												? "Continue"
												: "Complete Sign up"}
									</Button>
									<SignInTermsFooter />
								</div>
							)
						) : (
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
									onClick={() => void login()}
								>
									Sign in
								</Button>
								<SignInTermsFooter />
							</div>
						)}

						{signInGate.gated ? (
							<SignInOtpDialog gate={signInGate} pricingUrl={pricingUrl} />
						) : (
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
						)}
					</div>
				)}
			</div>
		</div>
	);
}
