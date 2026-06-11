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

/** Unified documents list (All Documents, drafts panel, templates). */
export function invalidateDocumentsList(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return queryClient.invalidateQueries({
		queryKey: rpcQuery.documents.list.key(),
	});
}

/** Bell notification feed. */
export function invalidateNotificationsInbox(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return queryClient.invalidateQueries({
		queryKey: rpcQuery.notifications.inbox.key(),
	});
}

/** Documents browser + bell feed after sign, send, dismiss, org switch. */
export function invalidateDocumentsAndNotifications(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return Promise.all([
		invalidateDocumentsList(queryClient, rpcQuery),
		invalidateNotificationsInbox(queryClient, rpcQuery),
	]);
}

/** Activation milestones + practice pieceCid (checklist, floating card). */
export function invalidateActivationProgress(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return queryClient.invalidateQueries({
		queryKey: rpcQuery.users.activation.get.key(),
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
