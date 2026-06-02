import type { QueryClient } from "@tanstack/react-query";
import type { FilosignRpcQueryUtils } from "../context/FilosignContext";
import { filosignKeys } from "./query-keys";

/** Refetch crypto unlock state after seed is set (unlock / recovery). */
export async function invalidateSessionQueries(
	queryClient: QueryClient,
	walletAddress: string | undefined,
) {
	await Promise.all([
		queryClient.invalidateQueries({
			queryKey: filosignKeys.cryptoUnlocked(walletAddress),
		}),
		queryClient.invalidateQueries({
			queryKey: filosignKeys.authedApi(walletAddress),
		}),
	]);
}

/** Refetch on-chain registry + session (e.g. after `users.register`). */
export async function invalidateAuthQueries(
	queryClient: QueryClient,
	walletAddress: string | undefined,
) {
	await Promise.all([
		queryClient.invalidateQueries({
			queryKey: filosignKeys.keyRegistrySnapshot(walletAddress),
		}),
		invalidateSessionQueries(queryClient, walletAddress),
	]);
}

export function invalidateUserProfile(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return queryClient.invalidateQueries({
		queryKey: rpcQuery.users.profile.me.key(),
	});
}

export function invalidateEntitlements(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return queryClient.invalidateQueries({
		queryKey: rpcQuery.billing.entitlements.key(),
	});
}

/** Entitlements + org/user billing summaries (checkout return / dashboard mount). */
export function invalidateBillingAndEntitlements(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return Promise.all([
		invalidateEntitlements(queryClient, rpcQuery),
		queryClient.invalidateQueries({
			queryKey: rpcQuery.billing.getOrgSummary.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: rpcQuery.billing.getWorkspaceBillingContext.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: rpcQuery.billing.getUserSummary.key(),
		}),
	]);
}

/** Inbox lists used by notifications (received files). */
export function invalidateInboxQueries(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return queryClient.invalidateQueries({
		queryKey: rpcQuery.files.list.received.key(),
	});
}

/** Email invite queries under sharing. */
export function invalidateSharingQueries(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return queryClient.invalidateQueries({
		queryKey: rpcQuery.sharing.key(),
	});
}

/** All org-domain queries (listMine, members, invites, …). */
export function invalidateOrgsQueries(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return queryClient.invalidateQueries({
		queryKey: rpcQuery.orgs.key(),
	});
}
