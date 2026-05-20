import type { QueryClient } from "@tanstack/react-query";
import type { FilosignRpcQueryUtils } from "../context/FilosignContext";
import { filosignKeys } from "./query-keys";

/** Refetch `useIsLoggedIn` after seed is set (unlock / recovery). On-chain registry unchanged. */
export async function invalidateSessionQueries(
	queryClient: QueryClient,
	walletAddress: string | undefined,
) {
	await queryClient.invalidateQueries({
		queryKey: filosignKeys.isLoggedIn(walletAddress),
	});
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

/** Inbox lists used by notifications (received files + sharing requests). */
export function invalidateInboxQueries(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return Promise.all([
		queryClient.invalidateQueries({
			queryKey: rpcQuery.files.list.received.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: rpcQuery.sharing.receivedRequests.key(),
		}),
	]);
}

/** All sharing-domain queries (sendable, receivable, requests, email invites, derived contacts). */
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

/** Connections → Contacts tab: sharing + profile lookups by address. */
export function invalidateConnectionsContactsTab(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return Promise.all([
		invalidateSharingQueries(queryClient, rpcQuery),
		queryClient.invalidateQueries({
			queryKey: rpcQuery.users.profile.key(),
		}),
	]);
}

/** Connections → Requests tab: pending incoming/outgoing share requests. */
export function invalidateConnectionsRequestsTab(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return Promise.all([
		queryClient.invalidateQueries({
			queryKey: rpcQuery.sharing.receivedRequests.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: rpcQuery.sharing.sentRequests.key(),
		}),
	]);
}
