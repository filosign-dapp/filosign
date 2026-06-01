import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { useAuthedApi } from "@filosign/react/auth";
import { useCreateOrganization } from "@filosign/react/orgs";
import { useUpdateUserProfile } from "@filosign/react/users";
import { useNavigate } from "@tanstack/react-router";
import type { ColdInviteEntrySearch } from "@/src/lib/domains/invites/cold-invite-search";
import { signDocumentSearchFromColdEntry } from "@/src/lib/domains/invites/cold-invite-search";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { useSetPersistedActiveOrganizationId } from "@/src/lib/filosign/persisted-active-org";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { logger } from "@/src/lib/utils/logger";

/** Profile sync, analytics, and post-registration navigation after key registration. */
export function useOnboardingComplete() {
	const captureAppEvent = useCaptureAppEvent();
	const updateUserProfile = useUpdateUserProfile();
	const createOrg = useCreateOrganization();
	const setActiveOrg = useSetPersistedActiveOrganizationId();
	const { onboardingForm, setOnboardingForm } = useStorePersist();
	const { data: auth } = useAuthedApi();
	const navigate = useNavigate();

	return async (search: ColdInviteEntrySearch) => {
		const coldPieceCid = search.coldPieceCid?.trim();
		captureAppEvent(CLIENT_ANALYTICS_EVENTS.onboardingCompleted, {
			...(coldPieceCid ? { piece_cid: coldPieceCid } : {}),
		});

		if (onboardingForm?.firstName) {
			const firstName = onboardingForm.firstName;
			const lastName = onboardingForm.lastName;

			await updateUserProfile.mutateAsync({
				firstName,
				lastName: lastName ? lastName : undefined,
			});

			try {
				const orgName = `${firstName}'s Workspace`;
				const created = await createOrg.mutateAsync(
					{ name: orgName },
					suppressGlobalErrorToast(),
				);
				if (created?.organization?.id) {
					setActiveOrg(created.organization.id);
				} else {
					throw new Error("No organization ID returned from server.");
				}
			} catch (error) {
				logger.error("Failed to automate default workspace creation:", error);
				showAppErrorToast(error);
				return;
			}

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

		await navigate({
			to: "/dashboard",
			search: {
				upgrade: search.upgrade,
				interval: search.interval,
			},
		});
	};
}
