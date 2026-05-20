const STORAGE_PREFIX = "filosign:access-jwt:";

export function accessJwtStorageKey(walletAddress: string): string {
	return `${STORAGE_PREFIX}${walletAddress.toLowerCase()}`;
}

export function readStoredAccessJwt(walletAddress: string): string | null {
	try {
		return sessionStorage.getItem(accessJwtStorageKey(walletAddress));
	} catch {
		return null;
	}
}

export function writeStoredAccessJwt(
	walletAddress: string,
	token: string | null,
): void {
	try {
		const key = accessJwtStorageKey(walletAddress);
		if (!token) sessionStorage.removeItem(key);
		else sessionStorage.setItem(key, token);
	} catch {
		// sessionStorage unavailable (SSR, private mode)
	}
}

type AccessJwtPayload = {
	sub?: string;
	exp?: number;
	typ?: string;
};

export function parseAccessJwtPayload(token: string): AccessJwtPayload | null {
	const parts = token.split(".");
	const payloadPart = parts[1];
	if (parts.length !== 3 || !payloadPart) return null;
	try {
		const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
		const json = atob(base64);
		return JSON.parse(json) as AccessJwtPayload;
	} catch {
		return null;
	}
}

/** Client-side expiry check (no signature verify — server enforces). */
export function isAccessJwtUsable(
	token: string,
	walletAddress: string,
	leewaySeconds = 15,
): boolean {
	const payload = parseAccessJwtPayload(token);
	if (!payload || payload.typ !== "access") return false;
	if (!payload.exp) return false;
	if (payload.sub?.toLowerCase() !== walletAddress.toLowerCase()) return false;
	const now = Math.floor(Date.now() / 1000);
	return now < payload.exp - leewaySeconds;
}
