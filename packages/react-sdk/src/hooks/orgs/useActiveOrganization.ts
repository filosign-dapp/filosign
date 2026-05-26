import { useMemo } from "react";
import { useActiveOrgId, useOrganizations } from "./useOrganizations";

export function useActiveOrganization() {
	const activeOrgId = useActiveOrgId();
	const { data } = useOrganizations();
	const organizations = data?.organizations ?? [];

	return useMemo(() => {
		if (!activeOrgId) return null;
		return organizations.find((o) => o.id === activeOrgId) ?? null;
	}, [activeOrgId, organizations]);
}
