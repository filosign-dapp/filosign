import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppRouterClient } from "./app-router-types";

export function normalizeApiBaseUrl(apiBaseUrl: string) {
	return apiBaseUrl.replace(/\/+$/, "");
}

export class FilosignSession {
	private token: string | null = null;
	private activeOrgId: string | null = null;

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

	setJwt(value: string | null | undefined) {
		if (value === null || value === undefined) {
			this.token = null;
			return;
		}
		this.token = value;
	}

	get jwtExists(): boolean {
		return this.token != null && this.token !== "";
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
