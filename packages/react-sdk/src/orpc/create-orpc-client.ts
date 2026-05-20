import {
	isAccessJwtUsable,
	readStoredAccessJwt,
	writeStoredAccessJwt,
} from "@filosign/auth/client";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppRouterClient } from "./app-router-types";

export function normalizeApiBaseUrl(apiBaseUrl: string) {
	return apiBaseUrl.replace(/\/+$/, "");
}

export class FilosignSession {
	private token: string | null = null;
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

	/** Re-hydrate access JWT from sessionStorage when the connected wallet changes. */
	bindWallet(walletAddress: string | null | undefined) {
		const next = walletAddress?.trim() ? walletAddress.trim() : null;
		if (next === this.walletAddress) return;
		this.walletAddress = next;

		if (!next) {
			this.token = null;
			return;
		}

		const stored = readStoredAccessJwt(next);
		if (stored && isAccessJwtUsable(stored, next)) {
			this.token = stored;
			return;
		}

		this.token = null;
		writeStoredAccessJwt(next, null);
	}

	setJwt(value: string | null | undefined, walletAddress?: string | null) {
		const wallet = walletAddress ?? this.walletAddress;
		if (value === null || value === undefined) {
			this.token = null;
			if (wallet) writeStoredAccessJwt(wallet, null);
			return;
		}
		this.token = value;
		if (wallet) writeStoredAccessJwt(wallet, value);
	}

	getJwt(): string | null {
		return this.token;
	}

	hasValidAccessJwt(walletAddress?: string | null): boolean {
		const wallet = walletAddress ?? this.walletAddress;
		if (!this.token || !wallet) return false;
		return isAccessJwtUsable(this.token, wallet);
	}

	get jwtExists(): boolean {
		return this.hasValidAccessJwt();
	}

	ensureJwt() {
		if (!this.jwtExists) {
			throw new Error("JWT token is missing - user is not logged in");
		}
	}

	getAuthorizationValue(): string | undefined {
		if (!this.jwtExists) return undefined;
		return `Bearer ${this.token}`;
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
			const orgId = session.getActiveOrgId();
			if (orgId) headers["X-Org-Id"] = orgId;
			return headers;
		},
	});
	return createORPCClient<AppRouterClient>(link);
}
