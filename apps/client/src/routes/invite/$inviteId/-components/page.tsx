import { CheckCircleIcon, FileTextIcon } from "@phosphor-icons/react";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { Loader } from "@/src/lib/components/ui/loader";
import { useInvite } from "@/src/routes/invite/$inviteId/-lib/context/context";
import { OnboardingSwitchAccountLink } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";
import { InviteDetailsCard } from "./invite-details-card";

function InviteCenteredLoader({ message }: { message: string }) {
	return (
		<div className="flex flex-col items-center gap-3">
			<InlineLoader size="lg" />
			<p className="text-muted-foreground">{message}</p>
		</div>
	);
}

export function InvitePage() {
	const {
		inviteData,
		view,
		handleSignUp,
		retryAutoRegister,
		autoRegisterError,
	} = useInvite();

	if (view === "boot") {
		return <Loader />;
	}

	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					<Logo className="mx-auto mb-6" textClassName="text-foreground" />

					{view === "success" ? (
						<div className="space-y-4">
							<div className="size-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
								<CheckCircleIcon className="size-10 text-green-600" />
							</div>
							<h1 className="text-2xl font-semibold">Invite Accepted!</h1>
							<p className="text-muted-foreground">
								You can now receive documents from this sender. Redirecting to
								dashboard...
							</p>
						</div>
					) : view === "claiming" || view === "auto-claiming" ? (
						<InviteCenteredLoader message="Accepting invite…" />
					) : view === "checking-account" || view === "setting-up" ? (
						<InviteCenteredLoader message="Setting up your account…" />
					) : view === "setup-failed" ? (
						<div className="space-y-6">
							<InviteDetailsCard inviteData={inviteData} />
							<div className="space-y-4 text-center">
								<h1 className="text-2xl font-semibold">
									Could not finish account setup
								</h1>
								<p className="text-muted-foreground">
									{autoRegisterError ?? "Check your connection and try again."}
								</p>
								<Button
									onClick={() => retryAutoRegister?.()}
									variant="primary"
									className="w-full"
								>
									Retry
								</Button>
							</div>
							<OnboardingSwitchAccountLink />
						</div>
					) : (
						<div className="space-y-6">
							<InviteDetailsCard inviteData={inviteData} />
							<div className="space-y-4">
								<h1 className="text-2xl font-semibold text-center">
									Join Filosign
								</h1>
								<p className="text-muted-foreground text-center">
									Sign up free to receive secure, verifiable documents. Your
									files are encrypted and permanently stored.
								</p>
								<div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
									<div className="flex items-center gap-3">
										<FileTextIcon className="size-5 text-primary" />
										<span className="text-sm">
											Private, encrypted documents
										</span>
									</div>
									<div className="flex items-center gap-3">
										<CheckCircleIcon className="size-5 text-primary" />
										<span className="text-sm">Legally binding signatures</span>
									</div>
									<div className="flex items-center gap-3">
										<CheckCircleIcon className="size-5 text-primary" />
										<span className="text-sm">
											Free to use - no hidden fees
										</span>
									</div>
								</div>
								<Button
									onClick={() => void handleSignUp()}
									variant="primary"
									className="w-full"
								>
									Accept Invitation
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
