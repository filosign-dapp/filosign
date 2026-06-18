import { useState } from "react";
import env from "@/src/env";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import { clientPublicCheckoutEnabled } from "@/src/lib/deployment";
import { storeLegalAssent } from "@/src/lib/web3/legal-assent-session";
import type { SignInController } from "@/src/routes/-lib/hooks/use-sign-in-controller";
import { requiresDesignPartnerAddendum } from "@/src/routes/-lib/utils/pilot-addendum-sign-in";
import { SignInCardShell } from "./card-shell";
import { signInGatedCardSubtitle } from "./gated-subtitle";
import { SignInTermsFooter } from "./terms-footer";

type GateState = SignInController["signInGate"]["gateState"];
type SignInGate = SignInController["signInGate"];

interface CardProps {
	signInGate: SignInGate;
	termsChecked: boolean;
	setTermsChecked: (v: boolean) => void;
}

const pricingUrl = `${env.VITE_ASTRO_URL.replace(/\/$/, "")}/pricing${
	clientPublicCheckoutEnabled() ? "" : "#pricing"
}`;

function SignInGateLoadingCard() {
	return (
		<SignInCardShell
			title="Verifying your access link"
			description="Checking your invite or checkout link. This usually takes a moment."
		>
			<div className="flex justify-center py-2">
				<InlineLoader size="lg" />
			</div>
		</SignInCardShell>
	);
}

function SignInGateFetchingCard({
	termsChecked,
	setTermsChecked,
}: Omit<CardProps, "signInGate">) {
	return (
		<SignInCardShell
			title="Complete sign up"
			description="Confirming your payment. This usually takes a few seconds."
			footer={
				<SignInTermsFooter
					checked={termsChecked}
					onCheckedChange={setTermsChecked}
				/>
			}
		>
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
		</SignInCardShell>
	);
}

function SignInGateBlockedCard({
	signInGate,
	termsChecked,
	setTermsChecked,
}: CardProps) {
	return (
		<SignInCardShell
			title="Finish setting up Filosign"
			description="We are still confirming your payment. Check your email for setup instructions. It is sent automatically once payment clears."
			footer={
				<SignInTermsFooter
					checked={termsChecked}
					onCheckedChange={setTermsChecked}
				/>
			}
		>
			<Button
				type="button"
				variant="default"
				size="lg"
				className="w-full"
				disabled={signInGate.authPending || !termsChecked}
				isLoading={signInGate.authPending}
				onClick={() => void signInGate.refetchGate()}
			>
				Try again
			</Button>
		</SignInCardShell>
	);
}

function SignInGateLoginHomeCard({
	signInGate,
	termsChecked,
	setTermsChecked,
}: CardProps) {
	return (
		<SignInCardShell
			title="Sign in to Filosign"
			description="Sign in with the email on your account."
			footer={
				<>
					<p className="text-center text-xs text-muted-foreground my-2">
						New user?{" "}
						<a
							href={pricingUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="font-medium text-primary underline-offset-4 hover:underline"
						>
							{clientPublicCheckoutEnabled()
								? "Browse our plans here"
								: "Request access"}
						</a>
					</p>
					<SignInTermsFooter
						checked={termsChecked}
						onCheckedChange={setTermsChecked}
					/>
				</>
			}
		>
			<Button
				type="button"
				variant="default"
				size="lg"
				className="w-full"
				disabled={signInGate.authPending || !termsChecked}
				isLoading={signInGate.authPending}
				onClick={() => {
					storeLegalAssent();
					signInGate.beginLogin();
				}}
			>
				Login
			</Button>
		</SignInCardShell>
	);
}

function SignInGateCompleteSignupCard({
	signInGate,
	gateState,
	termsChecked,
	setTermsChecked,
}: CardProps & {
	gateState: Extract<GateState, { status: "ready" }>;
}) {
	const isPaidSetup = gateState.gate === "paid_setup";
	const isPlatformInvite = gateState.gate === "platform_invite";
	const requiresPilotAddendum = requiresDesignPartnerAddendum(signInGate);

	return (
		<SignInCardShell
			title={
				isPlatformInvite
					? "Activate your partner trial"
					: signInGate.isReturningUser
						? "Sign in to Filosign"
						: "Complete sign up"
			}
			description={
				isPlatformInvite
					? "Sign in with the email on your invite to unlock Teams Pro on your workspace."
					: signInGatedCardSubtitle({
							isReturningUser: signInGate.isReturningUser,
							isAdminBootstrap: signInGate.isAdminBootstrap,
							isPaidSetup,
							planLabel: gateState.planLabel,
							effectiveEmail: signInGate.effectiveEmail,
							needsEmailInput: gateState.needsEmailInput,
						})
			}
			footer={
				<SignInTermsFooter
					checked={termsChecked}
					onCheckedChange={setTermsChecked}
					requiresPilotAddendum={requiresPilotAddendum}
				/>
			}
		>
			<Button
				type="button"
				variant="default"
				size="lg"
				className="w-full"
				disabled={signInGate.authPending || !termsChecked}
				isLoading={signInGate.authPending}
				onClick={() => {
					storeLegalAssent({
						includePilotAddendum: requiresPilotAddendum,
					});
					void signInGate.beginEmailAuth();
				}}
			>
				{signInGate.isReturningUser
					? "Sign in"
					: signInGate.isAdminBootstrap
						? "Continue"
						: "Complete Sign up"}
			</Button>
		</SignInCardShell>
	);
}

export function SignInGatedCard({ signInGate }: { signInGate: SignInGate }) {
	const { gateState } = signInGate;
	const [termsChecked, setTermsChecked] = useState(false);

	if (gateState.status === "loading") {
		return <SignInGateLoadingCard />;
	}
	if (gateState.status === "fetching_setup") {
		return (
			<SignInGateFetchingCard
				termsChecked={termsChecked}
				setTermsChecked={setTermsChecked}
			/>
		);
	}
	if (gateState.status === "blocked") {
		return (
			<SignInGateBlockedCard
				signInGate={signInGate}
				termsChecked={termsChecked}
				setTermsChecked={setTermsChecked}
			/>
		);
	}
	if (signInGate.showLoginHome) {
		return (
			<SignInGateLoginHomeCard
				signInGate={signInGate}
				termsChecked={termsChecked}
				setTermsChecked={setTermsChecked}
			/>
		);
	}
	if (gateState.status === "ready") {
		return (
			<SignInGateCompleteSignupCard
				signInGate={signInGate}
				gateState={gateState}
				termsChecked={termsChecked}
				setTermsChecked={setTermsChecked}
			/>
		);
	}

	return <SignInGateLoadingCard />;
}
