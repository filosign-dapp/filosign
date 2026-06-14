import { useFilosignContext } from "@filosign/react";
import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import {
	useActiveOrgId,
	useOrganizations,
	useUpdateOrganization,
} from "@filosign/react/orgs";
import {
	prefetchDefaultTypedSignatures,
	useUpdateUserProfile,
} from "@filosign/react/users";
import { invalidateUserProfile } from "@filosign/react/invalidate-queries";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	defaultWorkspaceName,
	isReservedAccountFirstName,
	personalizedWorkspaceName,
} from "@/src/lib/auth/account-defaults";
import {
	navigatePostAuthDestination,
	resolvePostAuthDestination,
} from "@/src/lib/auth/post-auth-destination";
import type { ColdInviteEntrySearch } from "@/src/lib/domains/invites/cold-invite-search";
import { signDocumentSearchFromColdEntry } from "@/src/lib/domains/invites/cold-invite-search";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { logger } from "@/src/lib/utils/logger";
import type { OnboardingNamePayload } from "@/src/routes/onboarding/-components/OnboardingNameForm";

/** Profile sync, workspace rename, and post-personalization navigation. */
export function useOnboardingComplete() {
	const captureAppEvent = useCaptureAppEvent();
	const queryClient = useQueryClient();
	const { wallet, rpcQuery } = useFilosignContext();
	const updateUserProfile = useUpdateUserProfile();
	const updateOrganization = useUpdateOrganization();
	const { data: orgsData } = useOrganizations();
	const activeOrgId = useActiveOrgId();
	const { onboardingForm, setOnboardingForm } = useStorePersist();
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
		if (isReservedAccountFirstName(firstName)) {
			return;
		}
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

			await queryClient.refetchQueries({
				queryKey: [
					...rpcQuery.users.profile.me.key(),
					wallet?.account.address ?? null,
				],
			});

			void (async () => {
				try {
					const [profile, signatureList] = await Promise.all([
						rpcQuery.users.profile.me.call(),
						rpcQuery.users.signatures.list.call(),
					]);
					const { ensuredRoles } = await prefetchDefaultTypedSignatures({
						rpcQuery,
						profile: {
							firstName: profile.firstName,
							lastName: profile.lastName,
							email: profile.email,
							username: profile.username,
							defaultSignatureId: profile.defaultSignatureId,
							defaultInitialId: profile.defaultInitialId,
						},
						signatures: signatureList.signatures ?? [],
					});
					if (ensuredRoles.length === 0) return;
					await Promise.all([
						queryClient.invalidateQueries({
							queryKey: rpcQuery.users.signatures.list.key(),
						}),
						invalidateUserProfile(queryClient, rpcQuery),
					]);
				} catch {
					// Non-blocking warmup before cold-sign navigation.
				}
			})();
		}

		if (!firstName) {
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
			return;
		}

		const destination = resolvePostAuthDestination({
			coldSearch: search,
			signSearch: signDocumentSearchFromColdEntry(search),
			profile: { firstName },
			profilePending: false,
		});

		if (destination.type === "pending" || destination.type === "onboarding") {
			return;
		}

		await navigatePostAuthDestination(navigate, destination);
	};
}
