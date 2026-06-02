import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useFilosignContext } from "../context/useFilosignContext";
import {
	invalidateBillingAndEntitlements as invalidateBillingAndEntitlementsQueries,
	invalidateEntitlements as invalidateEntitlementsQueries,
} from "./invalidate-queries";
import { useFilosignRpc } from "./use-filosign-rpc";

export {
	invalidateBillingAndEntitlements,
	invalidateEntitlements,
} from "./invalidate-queries";

export function useInvalidateEntitlements() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	return () => {
		void invalidateEntitlementsQueries(queryClient, rpcQuery);
	};
}

/** Refetch billing limits when a screen mounts (e.g. envelope compose). */
export function useRefetchEntitlementsOnMount() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const { isAuthed } = useFilosignRpc();

	useEffect(() => {
		if (!isAuthed) return;
		void invalidateEntitlementsQueries(queryClient, rpcQuery);
	}, [isAuthed, queryClient, rpcQuery]);
}

/**
 * Dashboard shell: refetch plan + billing after Dodo checkout return (server cache
 * invalidation alone is not enough for TanStack Query).
 */
export function useRefetchBillingOnDashboardMount() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const { isAuthed } = useFilosignRpc();

	useEffect(() => {
		if (!isAuthed) return;
		void invalidateBillingAndEntitlementsQueries(queryClient, rpcQuery);
	}, [isAuthed, queryClient, rpcQuery]);
}
