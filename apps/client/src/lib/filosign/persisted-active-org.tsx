import { useFilosignContext } from "@filosign/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useStorePersist } from "@/src/lib/filosign/use-store";

/**
 * Restores `X-Org-Id` from zustand after rehydration and keeps `FilosignSession` in sync.
 */
export function PersistedActiveOrganizationSync() {
	const { session } = useFilosignContext();

	useEffect(() => {
		const unsub = useStorePersist.persist.onFinishHydration((state) => {
			session.setActiveOrgId(state.activeOrgId ?? null);
		});
		if (useStorePersist.persist.hasHydrated()) {
			session.setActiveOrgId(useStorePersist.getState().activeOrgId ?? null);
		}
		return unsub;
	}, [session]);

	useEffect(
		() =>
			useStorePersist.subscribe((s) => {
				session.setActiveOrgId(s.activeOrgId ?? null);
			}),
		[session],
	);

	return null;
}

/** Like `session.setActiveOrgId` plus zustand + query invalidation. */
export function useSetPersistedActiveOrganizationId() {
	const { session } = useFilosignContext();
	const queryClient = useQueryClient();

	return (orgId: string | null | undefined) => {
		const v = orgId?.trim() ? orgId.trim() : null;
		session.setActiveOrgId(v);
		useStorePersist.setState({ activeOrgId: v });
		void queryClient.invalidateQueries();
	};
}
