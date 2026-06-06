import { SpinnerIcon } from "@phosphor-icons/react";
import env from "@/src/env";
import { Button } from "@/src/lib/components/ui/button";
import type { SignInController } from "@/src/routes/-lib/hooks/use-sign-in-controller";
import { signInGatedCardSubtitle } from "./gated-subtitle";
import { SignInTermsFooter } from "./terms-footer";

type GateState = SignInController["signInGate"]["gateState"];
type SignInGate = SignInController["signInGate"];

const pricingUrl = `${env.VITE_ASTRO_URL.replace(/\/$/, "")}/pricing`;

function SignInGateLoadingCard() {
	return (
		<div className="flex flex-col items-center gap-4 py-8">
			<SpinnerIcon
				className="size-10 animate-spin text-muted-foreground"
				aria-hidden
			/>
			<p className="text-sm text-muted-foreground">
				Verifying your access link…
			</p>
		</div>
	);
}

function SignInGateFetchingCard() {
	return (
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
	);
}

function SignInGateBlockedCard({ signInGate }: { signInGate: SignInGate }) {
	return (
		<div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-xs">
			<div className="border-b border-border pb-4 text-left">
				<p className="font-manrope font-semibold tracking-tight text-foreground">
					Finish setting up Filosign
				</p>
				<p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
					We are still confirming your payment. Check your email for setup
					instructions. It is sent automatically once payment clears.
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
	);
}

function SignInGateLoginHomeCard({ signInGate }: { signInGate: SignInGate }) {
	return (
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
		<div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-xs">
			<div className="border-b border-border pb-4 text-left">
				<p className="font-manrope font-semibold tracking-tight text-foreground">
					{signInGate.isReturningUser
						? "Sign in to Filosign"
						: "Complete sign up"}
				</p>
				<p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
					{signInGatedCardSubtitle({
						isReturningUser: signInGate.isReturningUser,
						isAdminBootstrap: signInGate.isAdminBootstrap,
						isPaidSetup,
						planLabel: gateState.planLabel,
						effectiveEmail: signInGate.effectiveEmail,
						needsEmailInput: gateState.needsEmailInput,
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
