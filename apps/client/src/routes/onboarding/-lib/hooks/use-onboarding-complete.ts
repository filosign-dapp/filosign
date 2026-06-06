import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { useAuthedApi } from "@filosign/react/auth";
import {
	useActiveOrgId,
	useOrganizations,
	useUpdateOrganization,
} from "@filosign/react/orgs";
import { useUpdateUserProfile } from "@filosign/react/users";
import { useNavigate } from "@tanstack/react-router";
import {
	defaultWorkspaceName,
	personalizedWorkspaceName,
} from "@/src/lib/auth/account-defaults";
import type { ColdInviteEntrySearch } from "@/src/lib/domains/invites/cold-invite-search";
import { signDocumentSearchFromColdEntry } from "@/src/lib/domains/invites/cold-invite-search";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { logger } from "@/src/lib/utils/logger";
import type { OnboardingNamePayload } from "@/src/routes/onboarding/-components/OnboardingNameForm";

/** Profile sync, workspace rename, and post-personalization navigation. */
export function useOnboardingComplete() {
	const captureAppEvent = useCaptureAppEvent();
	const updateUserProfile = useUpdateUserProfile();
	const updateOrganization = useUpdateOrganization();
	const { data: orgsData } = useOrganizations();
	const activeOrgId = useActiveOrgId();
	const { onboardingForm, setOnboardingForm } = useStorePersist();
	const { data: auth } = useAuthedApi();
	const navigate = useNavigate();

	return async (
		search: ColdInviteEntrySearch,
		names: OnboardingNamePayload,
	) => {
		const coldPieceCid = search.coldPieceCid?.trim();
		captureAppEvent(CLIENT_ANALYTICS_EVENTS.onboardingCompleted, {
			...(coldPieceCid ? { piece_cid: coldPieceCid } : {}),
		});

		const firstName = names.firstName.trim();
		const lastName = names.lastName.trim();
		if (firstName) {
			await updateUserProfile.mutateAsync({
				firstName,
				lastName: lastName ? lastName : undefined,
			});

			const activeOrg = orgsData?.organizations?.find(
				(org) => org.id === activeOrgId,
			);
			const defaultName = defaultWorkspaceName();
			if (activeOrg?.name === defaultName) {
				try {
					await updateOrganization.mutateAsync(
						{ name: personalizedWorkspaceName(firstName) },
						suppressGlobalErrorToast(),
					);
				} catch (error) {
					logger.error("Failed to rename default workspace:", error);
					showAppErrorToast(error);
					return;
				}
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
			});
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
