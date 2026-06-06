import Logo from "@/src/lib/components/app/chrome/logo";
import { useSignIn } from "@/src/routes/-lib/context/sign-in-context";
import { SignInFailureView } from "./failure-view";
import { SignInProgressView } from "./progress-view";
import { SignInWelcomeView } from "./welcome-view";

function isFailureView(view: string) {
	return view === "registration-failed" || view === "bootstrap-failed";
}

function isProgressView(view: string) {
	return view === "auto-registering" || view === "signing-in";
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

				{isFailureView(view) ? (
					<SignInFailureView
						view={view}
						autoRegisterError={autoRegisterError}
						retryAutoRegister={retryAutoRegister}
						isRegistered={isRegistered}
					/>
				) : isProgressView(view) ? (
					<SignInProgressView
						view={view}
						showColdInviteMismatch={showColdInviteMismatch}
						coldInviteWarning={coldInviteWarning}
						continueAnywayColdSearch={continueAnywayColdSearch}
					/>
				) : (
					<SignInWelcomeView
						coldReturn={coldReturn}
						buttonLoading={buttonLoading}
						login={login}
						signInGate={signInGate}
					/>
				)}
			</div>
		</div>
	);
}
