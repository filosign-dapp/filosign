import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { useAuthedApi } from "@filosign/react/auth";
import { useUpdateUserProfile } from "@filosign/react/users";
import { useNavigate } from "@tanstack/react-router";
import type { ColdInviteEntrySearch } from "@/src/lib/domains/invites/cold-invite-search";
import { signDocumentSearchFromColdEntry } from "@/src/lib/domains/invites/cold-invite-search";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { logger } from "@/src/lib/utils/logger";

/** Profile sync, analytics, and post-registration navigation after key registration. */
export function useOnboardingComplete() {
	const captureAppEvent = useCaptureAppEvent();
	const updateUserProfile = useUpdateUserProfile();
	const { onboardingForm, setOnboardingForm } = useStorePersist();
	const { data: auth } = useAuthedApi();
	const navigate = useNavigate();

	return async (search: ColdInviteEntrySearch) => {
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

		const coldSign = signDocumentSearchFromColdEntry(search);
		if (coldSign) {
			await navigate({
				to: "/dashboard/document/sign",
				search: coldSign,
			} as never);
			return;
		}

		await navigate({ to: "/dashboard" });
	};
}
