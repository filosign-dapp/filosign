import type { Address, Hex } from "viem";

export type RefreshSession = {
	id: string;
	walletAddress: Address;
	familyId: string;
	tokenHash: string;
	expiresAt: Date;
	userAgent?: string | null;
};

export type AuthAuditParams = {
	event: string;
	walletAddress?: Address;
	ip?: string;
	userAgent?: string;
	detail?: string;
};

export type AuthStore = {
	upsertAuthNonce(walletAddress: Address, nonce: Hex): Promise<void>;
	takeAuthNonce(walletAddress: Address): Promise<Hex | null>;
	revokeAccessJti(jti: string, expiresAt: Date): Promise<void>;
	isAccessJtiRevoked(jti: string): Promise<boolean>;
	createRefreshSession(params: {
		walletAddress: Address;
		rawToken: string;
		userAgent?: string | null;
	}): Promise<{ familyId: string; sessionId: string }>;
	findActiveRefreshSession(rawToken: string): Promise<RefreshSession | null>;
	rotateRefreshSession(params: {
		session: RefreshSession;
		newRawToken: string;
	}): Promise<void>;
	revokeRefreshFamily(familyId: string): Promise<void>;
	detectRefreshTokenReuse(rawToken: string): Promise<string | null>;
	recordAuthAuditEvent(params: AuthAuditParams): Promise<void>;
};
