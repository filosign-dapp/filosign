import { useFilosignContext } from "@filosign/react";
import { useAuthedApi, useIsRegistered } from "@filosign/react/auth";
import {
	CheckCircleIcon,
	EnvelopeIcon,
	FileTextIcon,
	UserCircleIcon,
} from "@phosphor-icons/react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import Logo from "@/src/lib/components/shared/Logo";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { Loader } from "@/src/lib/components/ui/loader";
import { useThirdwebLogin } from "@/src/lib/hooks/use-thirdweb-login";
import { useThirdwebWalletAuth } from "@/src/lib/hooks/use-thirdweb-wallet-auth";
import { logger } from "@/src/lib/utils/logger";
import { OnboardingSwitchAccountLink } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";

function InvitePage() {
	const { inviteId } = useParams({ from: "/invite/$inviteId" });
	const { ready, authenticated } = useThirdwebWalletAuth();
	const { login } = useThirdwebLogin();
	const { rpc, ready: filosignReady } = useFilosignContext();
	const { data: auth } = useAuthedApi();
	const navigate = useNavigate();
	const isRegistered = useIsRegistered();

	const [inviteData, setInviteData] = useState<{
		inviteeEmail: string;
		senderName?: string;
		message?: string;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isClaiming, setIsClaiming] = useState(false);
	const [claimSuccess, setClaimSuccess] = useState(false);

	// Fetch invite details
	useEffect(() => {
		const fetchInvite = async () => {
			if (!filosignReady || !inviteId) return;

			try {
				const data = z
					.object({
						inviteeEmail: z.string(),
						senderName: z.string(),
						message: z.string().nullable(),
					})
					.parse(await rpc.sharing.inviteById({ id: inviteId }));

				setInviteData({
					inviteeEmail: data.inviteeEmail,
					senderName: data.senderName,
					message: data.message ?? undefined,
				});
			} catch (error) {
				logger.error("Failed to fetch invite:", error);
				toast.error("Invalid or expired invite link");
			} finally {
				setIsLoading(false);
			}
		};

		fetchInvite();
	}, [rpc, filosignReady, inviteId]);

	// Auto-claim if already logged in and registered
	useEffect(() => {
		const claimInvite = async () => {
			if (
				!ready ||
				!authenticated ||
				!isRegistered.data ||
				!auth ||
				!inviteId ||
				claimSuccess
			) {
				return;
			}

			setIsClaiming(true);

			try {
				await auth.rpc.sharing.inviteClaim({ id: inviteId });
				setClaimSuccess(true);
				toast.success(
					"Invite accepted! You can now receive documents from this sender.",
				);

				// Redirect after a short delay
				setTimeout(() => {
					navigate({ to: "/dashboard/connections" });
				}, 2000);
			} catch (error) {
				logger.error("Failed to claim invite:", error);
				toast.error("Failed to accept invite. It may have expired.");
			} finally {
				setIsClaiming(false);
			}
		};

		claimInvite();
	}, [
		ready,
		authenticated,
		isRegistered.data,
		auth,
		inviteId,
		navigate,
		claimSuccess,
	]);

	const handleSignUp = async () => {
		// Store invite ID in session storage so we can claim after onboarding
		if (inviteId) {
			sessionStorage.setItem("pendingInviteId", inviteId);
		}
		login();
	};

	if (isLoading || !ready) {
		return <Loader />;
	}

	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					<Logo
						className="mx-auto mb-6"
						textClassName="text-foreground font-semibold"
					/>

					{claimSuccess ? (
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
					) : isClaiming ? (
						<div className="flex flex-col items-center gap-3">
							<InlineLoader size="lg" />
							<p className="text-muted-foreground">Accepting invite…</p>
						</div>
					) : authenticated && isRegistered.isPending ? (
						<div className="flex flex-col items-center gap-3">
							<InlineLoader size="lg" />
							<p className="text-muted-foreground">Checking your account…</p>
						</div>
					) : authenticated && isRegistered.data === false ? (
						<div className="space-y-6">
							<div className="bg-card border rounded-2xl p-6 space-y-4">
								<div className="flex items-center gap-3">
									<div className="size-12 bg-primary/10 rounded-full flex items-center justify-center">
										<UserCircleIcon className="size-6 text-primary" />
									</div>
									<div className="text-left">
										<p className="font-medium">
											{inviteData?.senderName || "Someone"}
										</p>
										<p className="text-sm text-muted-foreground">
											wants to send you documents
										</p>
									</div>
								</div>
								{inviteData?.message && (
									<div className="bg-muted p-3 rounded-lg">
										<p className="text-sm italic">
											&quot;{inviteData.message}&quot;
										</p>
									</div>
								)}
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<EnvelopeIcon className="size-4" />
									<span>Sent to {inviteData?.inviteeEmail}</span>
								</div>
							</div>
							<div className="space-y-4 text-center">
								<h1 className="text-2xl font-semibold">
									Finish creating your account
								</h1>
								<p className="text-muted-foreground">
									You&apos;re signed in. Continue setup to accept this
									invitation, or switch accounts if you logged in with the wrong
									one.
								</p>
								<Button
									onClick={() => navigate({ to: "/onboarding" })}
									variant="primary"
									className="w-full"
								>
									Continue account setup
								</Button>
							</div>
							<OnboardingSwitchAccountLink />
						</div>
					) : authenticated && isRegistered.data === true && !claimSuccess ? (
						<div className="flex flex-col items-center gap-3">
							<InlineLoader size="lg" />
							<p className="text-muted-foreground">Accepting invite…</p>
						</div>
					) : (
						<div className="space-y-6">
							<div className="bg-card border rounded-2xl p-6 space-y-4">
								<div className="flex items-center gap-3">
									<div className="size-12 bg-primary/10 rounded-full flex items-center justify-center">
										<UserCircleIcon className="size-6 text-primary" />
									</div>
									<div className="text-left">
										<p className="font-medium">
											{inviteData?.senderName || "Someone"}
										</p>
										<p className="text-sm text-muted-foreground">
											wants to send you documents
										</p>
									</div>
								</div>

								{inviteData?.message && (
									<div className="bg-muted p-3 rounded-lg">
										<p className="text-sm italic">
											&quot;{inviteData.message}&quot;
										</p>
									</div>
								)}

								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<EnvelopeIcon className="size-4" />
									<span>Sent to {inviteData?.inviteeEmail}</span>
								</div>
							</div>

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
									onClick={handleSignUp}
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

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/invite/$inviteId/")({
	component: InvitePage,
});
