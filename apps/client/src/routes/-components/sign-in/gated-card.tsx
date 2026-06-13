import { SpinnerIcon } from "@phosphor-icons/react";
import env from "@/src/env";
import { Button } from "@/src/lib/components/ui/button";
import type { SignInController } from "@/src/routes/-lib/hooks/use-sign-in-controller";
import { SignInCardShell } from "./card-shell";
import { signInGatedCardSubtitle } from "./gated-subtitle";
import { SignInTermsFooter } from "./terms-footer";

type GateState = SignInController["signInGate"]["gateState"];
type SignInGate = SignInController["signInGate"];

const pricingUrl = `${env.VITE_ASTRO_URL.replace(/\/$/, "")}/pricing`;

function SignInGateLoadingCard() {
	return (
		<SignInCardShell
			title="Verifying your access link"
			description="Checking your invite or checkout link. This usually takes a moment."
		>
			<div className="flex justify-center py-2">
				<SpinnerIcon
					className="size-8 animate-spin text-muted-foreground"
					aria-hidden
				/>
			</div>
		</SignInCardShell>
	);
}

function SignInGateFetchingCard() {
	return (
		<SignInCardShell
			title="Complete sign up"
			description="Confirming your payment. This usually takes a few seconds."
			footer={<SignInTermsFooter />}
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

function SignInGateBlockedCard({ signInGate }: { signInGate: SignInGate }) {
	return (
		<SignInCardShell
			title="Finish setting up Filosign"
			description="We are still confirming your payment. Check your email for setup instructions. It is sent automatically once payment clears."
			footer={<SignInTermsFooter />}
		>
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
		</SignInCardShell>
	);
}

function SignInGateLoginHomeCard({ signInGate }: { signInGate: SignInGate }) {
	return (
		<SignInCardShell
			title="Sign in to Filosign"
			description="Sign in with the email on your account."
			footer={
				<>
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
				</>
			}
		>
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
		</SignInCardShell>
	);
}

function SignInGateCompleteSignupCard({
	signInGate,
	gateState,
}: {
	signInGate: SignInGate;
	gateState: Extract<GateState, { status: "ready" }>;
}) {
	const isPaidSetup = gateState.gate === "paid_setup";

	return (
		<SignInCardShell
			title={
				signInGate.isReturningUser ? "Sign in to Filosign" : "Complete sign up"
			}
			description={signInGatedCardSubtitle({
				isReturningUser: signInGate.isReturningUser,
				isAdminBootstrap: signInGate.isAdminBootstrap,
				isPaidSetup,
				planLabel: gateState.planLabel,
				effectiveEmail: signInGate.effectiveEmail,
				needsEmailInput: gateState.needsEmailInput,
			})}
			footer={<SignInTermsFooter />}
		>
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
		</SignInCardShell>
	);
}

export function SignInGatedCard({ signInGate }: { signInGate: SignInGate }) {
	const { gateState } = signInGate;

	if (gateState.status === "loading") {
		return <SignInGateLoadingCard />;
	}
	if (gateState.status === "fetching_setup") {
		return <SignInGateFetchingCard />;
	}
	if (gateState.status === "blocked") {
		return <SignInGateBlockedCard signInGate={signInGate} />;
	}
	if (signInGate.showLoginHome) {
		return <SignInGateLoginHomeCard signInGate={signInGate} />;
	}
	if (gateState.status === "ready") {
		return (
			<SignInGateCompleteSignupCard
				signInGate={signInGate}
				gateState={gateState}
			/>
		);
	}

	return <SignInGateLoadingCard />;
}
