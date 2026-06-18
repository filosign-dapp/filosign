import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	isLegalAssentRequiredError,
	storeLegalAssent,
} from "@/src/lib/web3/legal-assent-session";
import type { SignInController } from "@/src/routes/-lib/hooks/use-sign-in-controller";
import { OnboardingSwitchAccountLink } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";
import { SignInCardShell } from "./card-shell";
import { SignInTermsFooter } from "./terms-footer";

type Props = Pick<
	SignInController,
	| "view"
	| "autoRegisterError"
	| "retryAutoRegister"
	| "isRegistered"
	| "autoRegisterFailedPhase"
	| "partnerInviteEmailMismatch"
	| "partnerInvitePilotAddendumRequired"
	| "requiresPilotAddendum"
>;

function failureCopy(
	view: Props["view"],
	errorMessage: string | null,
	failedPhase: Props["autoRegisterFailedPhase"],
	partnerInviteEmailMismatch: boolean,
	needsCombinedLegalAssent: boolean,
) {
	if (partnerInviteEmailMismatch) {
		return {
			title: "Wrong account for this invite",
			description:
				errorMessage ??
				"This partner invite was sent to a different email than the one you signed in with. Switch account, then sign in with the invited address.",
		};
	}

	if (needsCombinedLegalAssent) {
		return {
			title: "Confirm terms to continue",
			description:
				"Use the checkbox below to accept our Terms, Privacy Policy, and Design Partner Addendum, then try again.",
		};
	}

	if (view === "bootstrap-failed") {
		return {
			title: "Setup could not finish",
			description:
				errorMessage ??
				"We could not finish creating your Filosign keys. Try again, or sign out and use a different account.",
		};
	}

	if (failedPhase === "redeem") {
		return {
			title: "Partner trial could not activate",
			description:
				errorMessage ??
				"We could not apply your partner invite. Check your connection and try again.",
		};
	}

	if (isLegalAssentRequiredError(errorMessage)) {
		return {
			title: "Accept terms to continue",
			description:
				"Before we can finish creating your account, confirm that you agree to our Terms of Service and Privacy Policy.",
		};
	}

	return {
		title: "We could not verify your account",
		description:
			errorMessage ??
			"Something went wrong while checking your account. Try again in a moment.",
	};
}

export function SignInFailureView({
	view,
	autoRegisterError,
	retryAutoRegister,
	isRegistered,
	autoRegisterFailedPhase,
	partnerInviteEmailMismatch,
	partnerInvitePilotAddendumRequired,
	requiresPilotAddendum,
}: Props) {
	const [termsChecked, setTermsChecked] = useState(false);
	const needsLegalAssent = isLegalAssentRequiredError(autoRegisterError);
	const includePilotAddendum =
		requiresPilotAddendum || partnerInvitePilotAddendumRequired;
	const showTermsFooter = needsLegalAssent || includePilotAddendum;
	const copy = failureCopy(
		view,
		autoRegisterError,
		autoRegisterFailedPhase,
		partnerInviteEmailMismatch,
		showTermsFooter && includePilotAddendum,
	);

	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<h1 className="font-manrope text-2xl tracking-tight text-foreground md:text-3xl">
					Welcome to Filosign
				</h1>
				<p className="text-muted-foreground">
					Send envelopes, collect signatures, and keep a clear record when deals
					close.
				</p>
			</div>

			<SignInCardShell
				title={copy.title}
				description={copy.description}
				footer={
					showTermsFooter ? (
						<SignInTermsFooter
							checked={termsChecked}
							onCheckedChange={setTermsChecked}
							requiresPilotAddendum={includePilotAddendum}
						/>
					) : undefined
				}
			>
				{partnerInviteEmailMismatch ? (
					<OnboardingSwitchAccountLink className="mt-0" />
				) : (
					<Button
						type="button"
						variant="default"
						size="lg"
						className="w-full"
						disabled={showTermsFooter && !termsChecked}
						onClick={() => {
							if (showTermsFooter) {
								storeLegalAssent({
									includePilotAddendum: includePilotAddendum,
								});
							}
							if (retryAutoRegister) {
								void retryAutoRegister();
								return;
							}
							void isRegistered.refetch();
						}}
					>
						Try again
					</Button>
				)}
			</SignInCardShell>
		</div>
	);
}
