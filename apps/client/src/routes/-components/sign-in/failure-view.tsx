import { Button } from "@/src/lib/components/ui/button";
import type { SignInController } from "@/src/routes/-lib/hooks/use-sign-in-controller";
import { SignInCardShell } from "./card-shell";

type Props = Pick<
	SignInController,
	| "view"
	| "autoRegisterError"
	| "retryAutoRegister"
	| "isRegistered"
	| "autoRegisterFailedPhase"
>;

function failureCopy(
	view: Props["view"],
	errorMessage: string | null,
	failedPhase: Props["autoRegisterFailedPhase"],
) {
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
}: Props) {
	const copy = failureCopy(view, autoRegisterError, autoRegisterFailedPhase);

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

			<SignInCardShell title={copy.title} description={copy.description}>
				<Button
					type="button"
					variant="default"
					size="lg"
					className="w-full"
					onClick={() => {
						if (retryAutoRegister) {
							void retryAutoRegister();
							return;
						}
						void isRegistered.refetch();
					}}
				>
					Try again
				</Button>
			</SignInCardShell>
		</div>
	);
}
