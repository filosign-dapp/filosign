import {
	useAcceptOrgInvite,
	useActiveOrgId,
	useCloneOrgTemplateToEnvelope,
	useCreateOrganization,
	useInviteOrgMember,
	useOrganizationGet,
	useOrganizations,
	usePublishOrgMemberKeyWrap,
	useRemoveOrgMember,
	useSetOrgMemberRole,
} from "@filosign/react/orgs";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSetPersistedActiveOrganizationId } from "@/src/lib/filosign/persisted-active-org";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

export function useTeamSettingsController() {
	const { user } = useThirdweb();
	const navigate = useNavigate();
	const { setCreateForm } = useStorePersist();
	const myWalletNorm = user?.wallet?.address?.toLowerCase() ?? null;

	const { data, isPending: isLoading } = useOrganizations();
	const createOrg = useCreateOrganization();
	const setActiveOrg = useSetPersistedActiveOrganizationId();
	const activeOrgId = useActiveOrgId();
	const [name, setName] = useState("");
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteTokenPaste, setInviteTokenPaste] = useState("");
	const inviteMember = useInviteOrgMember();
	const acceptInvite = useAcceptOrgInvite();
	const wrapKey = usePublishOrgMemberKeyWrap();
	const setRole = useSetOrgMemberRole();
	const removeMember = useRemoveOrgMember();
	const cloneTemplate = useCloneOrgTemplateToEnvelope();

	const orgDetail = useOrganizationGet(activeOrgId ?? undefined);

	const orgs =
		(
			data as
				| {
						organizations?: Array<{
							id: string;
							name: string;
							role?: string;
						}>;
				  }
				| undefined
		)?.organizations ?? [];

	const activeMembership = useMemo(
		() => orgs.find((o) => o.id === activeOrgId),
		[orgs, activeOrgId],
	);

	const canInviteMembers =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";

	const members = (
		orgDetail.data as
			| {
					members?: Array<{
						walletAddress: string;
						status: string;
						role: string;
						hasKeyWrap?: boolean;
					}>;
			  }
			| undefined
	)?.members;
	const templates = (
		orgDetail.data as
			| {
					templates?: Array<{
						id: string;
						name: string;
					}>;
			  }
			| undefined
	)?.templates;

	return {
		navigate,
		setCreateForm,
		myWalletNorm,
		isLoading,
		createOrg,
		setActiveOrg,
		activeOrgId,
		name,
		setName,
		inviteEmail,
		setInviteEmail,
		inviteTokenPaste,
		setInviteTokenPaste,
		inviteMember,
		acceptInvite,
		wrapKey,
		setRole,
		removeMember,
		cloneTemplate,
		orgDetail,
		orgs,
		canInviteMembers,
		members,
		templates,
	};
}

export type TeamSettingsController = ReturnType<
	typeof useTeamSettingsController
>;
