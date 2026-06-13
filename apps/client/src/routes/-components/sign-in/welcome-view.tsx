import env from "@/src/env";
import { Button } from "@/src/lib/components/ui/button";
import type { SignInController } from "@/src/routes/-lib/hooks/use-sign-in-controller";
import { SignInCardShell } from "./card-shell";
import { SignInGatedCard } from "./gated-card";
import { SignInOtpDialog } from "./otp-dialog";
import { SignInTermsFooter } from "./terms-footer";

type Props = Pick<
	SignInController,
	"coldReturn" | "buttonLoading" | "login" | "signInGate"
>;

const pricingUrl = `${env.VITE_ASTRO_URL.replace(/\/$/, "")}/pricing`;

export function SignInWelcomeView({
	coldReturn,
	buttonLoading,
	login,
	signInGate,
}: Props) {
	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<h1 className="font-manrope text-2xl tracking-tight text-foreground md:text-3xl">
					Welcome to Filosign
				</h1>
				<p className="text-muted-foreground">
					{coldReturn
						? "Sign in to view and sign your document."
						: "Send envelopes, collect signatures, and keep a clear record when deals close."}
				</p>
			</div>

			{signInGate.gated ? (
				<SignInGatedCard signInGate={signInGate} />
			) : (
				<SignInCardShell
					title="Login to Filosign"
					description="Continue with your email or social account."
					footer={<SignInTermsFooter />}
				>
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
				</SignInCardShell>
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
						className="text-primary underline-offset-4 hover:underline"
					>
						Learn more on our site
					</a>
				</p>
			)}
		</div>
	);
}
