import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppRouterClient } from "./app-router-types";

export function normalizeApiBaseUrl(apiBaseUrl: string) {
	return apiBaseUrl.replace(/\/+$/, "");
}

export class FilosignSession {
	private thirdwebAuthToken: string | null = null;
	private activeOrgId: string | null = null;
	private walletAddress: string | null = null;

	private readonly activeOrgListeners = new Set<() => void>();

	subscribeActiveOrgId = (listener: () => void): (() => void) => {
		this.activeOrgListeners.add(listener);
		return () => {
			this.activeOrgListeners.delete(listener);
		};
	};

	setActiveOrgId(value: string | null | undefined) {
		const next = value?.trim() ? value.trim() : null;
		if (next === this.activeOrgId) return;
		this.activeOrgId = next;
		for (const listener of this.activeOrgListeners) {
			listener();
		}
	}

	getActiveOrgId(): string | null {
		return this.activeOrgId;
	}

	bindWallet(walletAddress: string | null | undefined) {
		this.walletAddress = walletAddress?.trim() ? walletAddress.trim() : null;
	}

	getWalletAddress(): string | null {
		return this.walletAddress;
	}

	setThirdwebAuthToken(value: string | null | undefined) {
		this.thirdwebAuthToken = value?.trim() ? value.trim() : null;
	}

	getThirdwebAuthToken(): string | null {
		return this.thirdwebAuthToken;
	}

	hasThirdwebSession(): boolean {
		return Boolean(this.thirdwebAuthToken && this.walletAddress);
	}

	getAuthorizationValue(): string | undefined {
		if (!this.thirdwebAuthToken) return undefined;
		return `Bearer ${this.thirdwebAuthToken}`;
	}
}

export function createFilosignOrpcClient(
	apiBaseUrl: string,
	session: FilosignSession,
): AppRouterClient {
	const base = normalizeApiBaseUrl(apiBaseUrl);
	const link = new RPCLink({
		url: `${base}/api/rpc`,
		fetch: (request, init) =>
			globalThis.fetch(request, {
				...init,
				credentials: "include",
			}),
		headers: async () => {
			const headers: Record<string, string> = {};
			const authorization = session.getAuthorizationValue();
			if (authorization) headers.Authorization = authorization;
			const wallet = session.getWalletAddress();
			if (wallet) headers["X-Wallet-Address"] = wallet;
			const orgId = session.getActiveOrgId();
			if (orgId) headers["X-Org-Id"] = orgId;
			return headers;
		},
	});
	return createORPCClient<AppRouterClient>(link);
}

/** Browser marketing / public pages - no wallet session headers. */
export function createPublicFilosignOrpcClient(
	apiBaseUrl: string,
): AppRouterClient {
	const base = normalizeApiBaseUrl(apiBaseUrl);
	const link = new RPCLink({
		url: `${base}/api/rpc`,
		fetch: (request, init) => globalThis.fetch(request, init),
	});
	return createORPCClient<AppRouterClient>(link);
}
