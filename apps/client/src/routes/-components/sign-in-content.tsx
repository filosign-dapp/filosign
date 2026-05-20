import { SpinnerIcon } from "@phosphor-icons/react";
import env from "@/src/env";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Button } from "@/src/lib/components/ui/button";
import { useSignIn } from "@/src/routes/-lib/context/sign-in-context";
import { ColdInviteNotForYouCallout } from "@/src/routes/onboarding/-components/ColdInviteNotForYouCallout";
import { OnboardingSwitchAccountLink } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";

export function SignInContent() {
	const {
		view,
		coldReturn,
		showColdInviteMismatch,
		coldInviteWarning,
		continueAnywayColdSearch,
		switchAccountPending,
		buttonLoading,
		isRegistered,
		handleSwitchAccountFromSignIn,
		goToOnboarding,
		login,
	} = useSignIn();

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

				{view === "registration-failed" ? (
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
				) : view === "needs-setup" ? (
					<div>
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
								disabled={showColdInviteMismatch ? switchAccountPending : false}
								isLoading={
									showColdInviteMismatch ? switchAccountPending : false
								}
								onClick={() =>
									showColdInviteMismatch
										? void handleSwitchAccountFromSignIn()
										: goToOnboarding()
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
								Send envelopes, collect signatures, and keep a clear record when
								deals close.
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
								onClick={() => void login()}
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
	);
}
