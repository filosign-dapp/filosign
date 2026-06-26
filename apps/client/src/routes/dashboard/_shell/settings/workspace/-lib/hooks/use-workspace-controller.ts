import {
	useActiveOrgId,
	useCloneOrgTemplateToEnvelope,
	useInviteOrgMember,
	useOrganizationGet,
	useOrganizations,
	usePublishOrgMemberKeyWrap,
	useRemoveOrgMember,
	useResendOrgInvite,
	useRevokeOrgInvite,
	useSetOrgMemberRole,
	useUpdateOrganization,
} from "@filosign/react/orgs";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

export function useWorkspaceSettingsController() {
	const { user } = useThirdweb();
	const navigate = useNavigate();
	const { setCreateForm } = useStorePersist();
	const myWalletNorm = user?.wallet?.address?.toLowerCase() ?? null;

	const { data } = useOrganizations();
	const updateOrg = useUpdateOrganization();
	const activeOrgId = useActiveOrgId();
	const inviteMember = useInviteOrgMember();
	const wrapKey = usePublishOrgMemberKeyWrap();
	const setRole = useSetOrgMemberRole();
	const removeMember = useRemoveOrgMember();
	const revokeInvite = useRevokeOrgInvite();
	const resendInvite = useResendOrgInvite();
	const cloneTemplate = useCloneOrgTemplateToEnvelope();

	const orgDetail = useOrganizationGet(activeOrgId ?? undefined);

	const orgs = data?.organizations ?? [];

	const activeMembership = useMemo(
		() => orgs.find((o) => o.id === activeOrgId),
		[orgs, activeOrgId],
	);

	const canInviteMembers =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";

	const members = orgDetail.data?.members;
	const pendingInvites = orgDetail.data?.pendingInvites;

	const templates = orgDetail.data?.templates;

	return {
		navigate,
		setCreateForm,
		myWalletNorm,
		updateOrg,
		activeOrgId,
		inviteMember,
		wrapKey,
		setRole,
		removeMember,
		revokeInvite,
		resendInvite,
		cloneTemplate,
		orgDetail,
		activeMembership,
		canInviteMembers,
		members,
		pendingInvites,
		templates,
	};
}

export type WorkspaceSettingsController = ReturnType<
	typeof useWorkspaceSettingsController
>;
