import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { useAuthedApi, useIsRegistered } from "@filosign/react/auth";
import { useUpdateUserProfile } from "@filosign/react/users";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	SKIP_COLD_SIGN_AFTER_MISMATCH,
	shouldSkipColdDocumentAfterMismatch,
} from "@/src/lib/domains/invites/cold-invite-search";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { logger } from "@/src/lib/utils/logger";
import { useThirdwebConnection } from "@/src/lib/web3/hooks/use-thirdweb-connection";

export function useOnboardingWelcomeController() {
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
			void navigate({
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

	const handleSubmit = async () => {
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
			void navigate({
				to: "/dashboard/document/sign",
				search: {
					pieceCid: search.coldPieceCid,
					invite: search.coldInvite,
				},
			} as never);
			return;
		}

		void navigate({ to: "/dashboard" });
	};

	const ctaLabel =
		coldReturnToSign && !skipColdDocument
			? "Sign your document"
			: "Go to Dashboard";

	return {
		userName,
		handleSubmit,
		ctaLabel,
	};
}
