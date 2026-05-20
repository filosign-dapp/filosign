import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { useAuthedApi, useIsRegistered } from "@filosign/react/auth";
import { useUpdateUserProfile } from "@filosign/react/users";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import Logo from "@/src/lib/components/shared/Logo";
import { Button } from "@/src/lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { useThirdwebConnection } from "@/src/lib/hooks/use-thirdweb-connection";
import {
	SKIP_COLD_SIGN_AFTER_MISMATCH,
	shouldSkipColdDocumentAfterMismatch,
} from "@/src/lib/routing/cold-invite-search";
import { logger } from "@/src/lib/utils/logger";

function OnboardingWelcomeCompletePage() {
	const captureAppEvent = useCaptureAppEvent();
	const [userName, setUserName] = useState("");
	const { onboardingForm, setOnboardingForm } = useStorePersist();
	const { ready } = useThirdwebConnection();
	const isRegistered = useIsRegistered();
	const updateUserProfile = useUpdateUserProfile();
	const { data: auth } = useAuthedApi();
	const navigate = useNavigate();
	const search = useSearch({ from: "/onboarding/welcome/" });

	const coldReturnToSign =
		Boolean(search.coldPieceCid?.trim()) && Boolean(search.coldInvite?.trim());
	const skipColdDocument = shouldSkipColdDocumentAfterMismatch(search);

	useEffect(() => {
		if (onboardingForm?.firstName || onboardingForm?.lastName) {
			setUserName(`${onboardingForm.firstName} ${onboardingForm.lastName}`);
		}
	}, [onboardingForm]);

	useEffect(() => {
		if (ready && !isRegistered.data && !isRegistered.isPending) {
			navigate({
				to: "/onboarding",
				search:
					coldReturnToSign && search.coldPieceCid && search.coldInvite
						? {
								coldPieceCid: search.coldPieceCid,
								coldInvite: search.coldInvite,
								...(skipColdDocument
									? { skipColdSign: SKIP_COLD_SIGN_AFTER_MISMATCH }
									: {}),
							}
						: {},
			} as never);
		}
	}, [
		ready,
		isRegistered.data,
		isRegistered.isPending,
		navigate,
		coldReturnToSign,
		search.coldPieceCid,
		search.coldInvite,
		skipColdDocument,
	]);

	async function handleSubmit() {
		const coldPieceCid = search.coldPieceCid?.trim();
		captureAppEvent(CLIENT_ANALYTICS_EVENTS.onboardingCompleted, {
			...(coldPieceCid ? { piece_cid: coldPieceCid } : {}),
		});
		if (onboardingForm?.firstName) {
			void updateUserProfile.mutateAsync({
				firstName: onboardingForm.firstName,
				lastName: onboardingForm.lastName ? onboardingForm.lastName : undefined,
			});

			setOnboardingForm({
				...onboardingForm,
				firstName: "",
				lastName: "",
				hasOnboarded: true,
			});
		}

		// Check for pending invite from session storage
		const pendingInviteId = sessionStorage.getItem("pendingInviteId");
		logger.debug("Checking for pending invite:", pendingInviteId);
		if (pendingInviteId && auth) {
			void auth.rpc.sharing
				.inviteClaim({ id: pendingInviteId })
				.then(() => {
					sessionStorage.removeItem("pendingInviteId");
				})
				.catch((error) => {
					logger.error("Failed to claim invite:", error);
				});
		}

		if (
			coldReturnToSign &&
			!skipColdDocument &&
			search.coldPieceCid &&
			search.coldInvite
		) {
			navigate({
				to: "/dashboard/document/sign",
				search: {
					pieceCid: search.coldPieceCid,
					invite: search.coldInvite,
				},
			} as never);
			return;
		}

		navigate({ to: "/dashboard" });
	}

	return (
		<div className="flex justify-center items-center min-h-screen">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: 0.2 }}
				className="flex flex-col justify-center items-center px-8 mx-auto w-full max-w-lg"
			>
				<Logo className="mb-4" textClassName="text-foreground font-semibold" />
				<Card className="w-full">
					<CardHeader>
						<CardTitle>All Set, {userName.split(" ")[0]}!</CardTitle>
						<CardDescription>Your Filosign account is ready.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Button
							className="w-full group"
							variant="primary"
							onClick={handleSubmit}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleSubmit();
								}
							}}
						>
							{coldReturnToSign && !skipColdDocument
								? "Sign your document"
								: "Go to Dashboard"}
							<CaretRightIcon
								className="transition-transform duration-200 size-4 group-hover:translate-x-1"
								weight="bold"
							/>
						</Button>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
}

import { createFileRoute } from "@tanstack/react-router";
import { coldInviteEntrySearchSchema } from "@/src/lib/routing/cold-invite-search";

export const Route = createFileRoute("/onboarding/welcome/")({
	validateSearch: coldInviteEntrySearchSchema,
	component: OnboardingWelcomeCompletePage,
});
