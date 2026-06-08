import { useFilosignContext } from "@filosign/react";
import {
	invalidateDocumentsAndNotifications,
	invalidateEntitlements,
	invalidateOrgsQueries,
	invalidateSharingQueries,
} from "@filosign/react/invalidate-queries";
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

	useEffect(() => {
		let activeOrgId = useStorePersist.getState().activeOrgId;
		return useStorePersist.subscribe((state) => {
			const next = state.activeOrgId;
			if (next === activeOrgId) return;
			activeOrgId = next;
			session.setActiveOrgId(next ?? null);
		});
	}, [session]);

	return null;
}

/** Like `session.setActiveOrgId` plus zustand + query invalidation. */
export function useSetPersistedActiveOrganizationId() {
	const { session, rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();

	return (orgId: string | null | undefined) => {
		const v = orgId?.trim() ? orgId.trim() : null;
		session.setActiveOrgId(v);
		useStorePersist.setState({ activeOrgId: v });
		void Promise.all([
			invalidateOrgsQueries(queryClient, rpcQuery),
			invalidateDocumentsAndNotifications(queryClient, rpcQuery),
			invalidateSharingQueries(queryClient, rpcQuery),
			invalidateEntitlements(queryClient, rpcQuery),
			queryClient.invalidateQueries({ queryKey: rpcQuery.files.key() }),
			queryClient.invalidateQueries({ queryKey: rpcQuery.metrics.key() }),
		]);
	};
}
