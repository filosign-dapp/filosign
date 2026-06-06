import { Button } from "@/src/lib/components/ui/button";
import type { SignInController } from "@/src/routes/-lib/hooks/use-sign-in-controller";

type Props = Pick<
	SignInController,
	"view" | "autoRegisterError" | "retryAutoRegister" | "isRegistered"
>;

export function SignInFailureView({
	view,
	autoRegisterError,
	retryAutoRegister,
	isRegistered,
}: Props) {
	return (
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
	);
}
