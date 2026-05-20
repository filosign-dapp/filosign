import type { FilosignRpcQueryUtils } from "@filosign/react";
import {
	invalidateConnectionsContactsTab,
	invalidateConnectionsRequestsTab,
	invalidateSharingQueries,
} from "@filosign/react/invalidate-queries";
import type { QueryClient } from "@tanstack/react-query";

export type UnifiedContact = {
	wallet: string;
	displayName: string | null;
	avatarUrl: string | null;
	canSendTo: boolean;
	canReceiveFrom: boolean;
};

export type SharingRequestRow = {
	id: string;
	senderWallet: string;
	recipientWallet: string;
	message: string | null;
	createdAt: string | Date;
};

export type ConnectionsTab = "contacts" | "requests";

export function buildContacts(
	accepted:
		| {
				people: Array<{
					walletAddress: string | null;
					displayName: string | null;
					avatarUrl: string | null;
				}>;
		  }
		| undefined,
	sendable: Array<{ recipientWallet: string; active: boolean }> | undefined,
	receivable: Array<{ senderWallet: string; active: boolean }> | undefined,
): UnifiedContact[] {
	const map = new Map<string, UnifiedContact>();

	for (const p of accepted?.people ?? []) {
		if (!p.walletAddress) continue;
		const k = p.walletAddress.toLowerCase();
		map.set(k, {
			wallet: p.walletAddress,
			displayName: p.displayName,
			avatarUrl: p.avatarUrl,
			canSendTo: true,
			canReceiveFrom: false,
		});
	}

	for (const a of sendable ?? []) {
		const k = a.recipientWallet.toLowerCase();
		const prev = map.get(k);
		if (prev) {
			prev.canSendTo = a.active;
		} else if (a.active) {
			map.set(k, {
				wallet: a.recipientWallet,
				displayName: null,
				avatarUrl: null,
				canSendTo: true,
				canReceiveFrom: false,
			});
		}
	}

	for (const a of receivable ?? []) {
		const k = a.senderWallet.toLowerCase();
		const prev = map.get(k);
		if (prev) {
			prev.canReceiveFrom = a.active;
		} else if (a.active) {
			map.set(k, {
				wallet: a.senderWallet,
				displayName: null,
				avatarUrl: null,
				canSendTo: false,
				canReceiveFrom: true,
			});
		}
	}

	return [...map.values()].sort((a, b) => {
		const an = (a.displayName || a.wallet).toLowerCase();
		const bn = (b.displayName || b.wallet).toLowerCase();
		return an.localeCompare(bn);
	});
}

export function sortPendingRequestRows(
	incoming: SharingRequestRow[],
	outgoing: SharingRequestRow[],
): { direction: "incoming" | "outgoing"; req: SharingRequestRow }[] {
	const rows = [
		...incoming.map((req) => ({ direction: "incoming" as const, req })),
		...outgoing.map((req) => ({ direction: "outgoing" as const, req })),
	];
	rows.sort((a, b) => {
		if (a.direction !== b.direction) {
			return a.direction === "incoming" ? -1 : 1;
		}
		return (
			new Date(b.req.createdAt).getTime() - new Date(a.req.createdAt).getTime()
		);
	});
	return rows;
}

export function invalidateSharingQueriesForConnections(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return invalidateSharingQueries(queryClient, rpcQuery);
}

export function invalidateQueriesForTab(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
	tab: ConnectionsTab,
) {
	if (tab === "contacts") {
		return invalidateConnectionsContactsTab(queryClient, rpcQuery);
	}
	return invalidateConnectionsRequestsTab(queryClient, rpcQuery);
}
