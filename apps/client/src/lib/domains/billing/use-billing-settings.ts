import { useActiveOrgId, useOrganizations } from "@filosign/react/orgs";
import { useMemo } from "react";

export function useBillingSettings() {
	const activeOrgId = useActiveOrgId();
	const { data } = useOrganizations();

	const activeMembership = useMemo(
		() =>
			data?.organizations.find(
				(organization) => organization.id === activeOrgId,
			),
		[data?.organizations, activeOrgId],
	);

	return {
		activeOrgId,
		activeMembership,
	};
}
