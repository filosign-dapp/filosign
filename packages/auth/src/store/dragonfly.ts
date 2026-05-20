import type { Address, Hex } from "viem";
import type { AuthConfig } from "../config";
import { hashRefreshToken } from "../tokens";
import { authRedisKeys } from "./keys";
import { type AuthRedis, createAuthRedis } from "./redis-client";
import type { AuthAuditParams, AuthStore, RefreshSession } from "./types";

type StoredRefreshSession = {
	id: string;
	walletAddress: Address;
	familyId: string;
	expiresAt: string;
	userAgent?: string | null;
};

function refreshTtlSeconds(config: AuthConfig): number {
	return config.refreshExpirationSeconds;
}

function parseSession(raw: string, tokenHash: string): RefreshSession | null {
	try {
		const data = JSON.parse(raw) as StoredRefreshSession;
		return {
			id: data.id,
			walletAddress: data.walletAddress,
			familyId: data.familyId,
			tokenHash,
			expiresAt: new Date(data.expiresAt),
			userAgent: data.userAgent ?? null,
		};
	} catch {
		return null;
	}
}

export type DragonflyAuthStore = AuthStore & {
	redis: AuthRedis;
	close(): void;
};

export function createDragonflyAuthStore(
	url: string,
	config: AuthConfig,
	options?: { onAudit?: (params: AuthAuditParams) => Promise<void> },
): DragonflyAuthStore {
	const redis = createAuthRedis(url);
	const ttlSec = refreshTtlSeconds(config);
	const nonceTtlSec = Math.ceil(config.nonceTtlMs / 1000);

	const store: DragonflyAuthStore = {
		redis,

		close() {
			redis.close();
		},

		async upsertAuthNonce(walletAddress, nonce) {
			await redis.setex(authRedisKeys.nonce(walletAddress), nonce, nonceTtlSec);
		},

		async takeAuthNonce(walletAddress) {
			const nonce = await redis.getdel(authRedisKeys.nonce(walletAddress));
			return (nonce as Hex | null) ?? null;
		},

		async revokeAccessJti(jti, expiresAt) {
			const ttlMs = expiresAt.getTime() - Date.now();
			if (ttlMs <= 0) return;
			const ttlSec = Math.ceil(ttlMs / 1000);
			await redis.setex(authRedisKeys.denyJti(jti), "1", ttlSec);
		},

		async isAccessJtiRevoked(jti) {
			return redis.exists(authRedisKeys.denyJti(jti));
		},

		async createRefreshSession({ walletAddress, rawToken, userAgent }) {
			const familyId = crypto.randomUUID();
			const id = crypto.randomUUID();
			const tokenHash = hashRefreshToken(rawToken);
			const expiresAt = new Date(
				Date.now() + config.refreshExpirationSeconds * 1000,
			);
			const payload: StoredRefreshSession = {
				id,
				walletAddress,
				familyId,
				expiresAt: expiresAt.toISOString(),
				userAgent: userAgent ?? null,
			};
			const hashKey = authRedisKeys.refreshByHash(tokenHash);
			const familyKey = authRedisKeys.refreshFamilyHashes(familyId);
			await redis.transaction([
				{
					command: "SET",
					args: [hashKey, JSON.stringify(payload), "EX", String(ttlSec)],
				},
				{ command: "SADD", args: [familyKey, tokenHash] },
				{ command: "EXPIRE", args: [familyKey, String(ttlSec)] },
			]);
			return { familyId, sessionId: id };
		},

		async findActiveRefreshSession(rawToken) {
			const tokenHash = hashRefreshToken(rawToken);
			const raw = await redis.get(authRedisKeys.refreshByHash(tokenHash));
			if (!raw) return null;
			const session = parseSession(raw, tokenHash);
			if (!session || session.expiresAt.getTime() <= Date.now()) return null;
			return session;
		},

		async rotateRefreshSession({ session, newRawToken }) {
			const oldHash = session.tokenHash;
			const newHash = hashRefreshToken(newRawToken);
			const expiresAt = new Date(
				Date.now() + config.refreshExpirationSeconds * 1000,
			);
			const payload: StoredRefreshSession = {
				id: session.id,
				walletAddress: session.walletAddress,
				familyId: session.familyId,
				expiresAt: expiresAt.toISOString(),
				userAgent: session.userAgent ?? null,
			};
			const familyKey = authRedisKeys.refreshFamilyHashes(session.familyId);
			await redis.transaction([
				{
					command: "SET",
					args: [
						authRedisKeys.refreshSuperseded(oldHash),
						session.familyId,
						"EX",
						String(ttlSec),
					],
				},
				{ command: "DEL", args: [authRedisKeys.refreshByHash(oldHash)] },
				{
					command: "SET",
					args: [
						authRedisKeys.refreshByHash(newHash),
						JSON.stringify(payload),
						"EX",
						String(ttlSec),
					],
				},
				{ command: "SADD", args: [familyKey, newHash] },
				{ command: "EXPIRE", args: [familyKey, String(ttlSec)] },
			]);
		},

		async revokeRefreshFamily(familyId) {
			const familyKey = authRedisKeys.refreshFamilyHashes(familyId);
			const hashes = await redis.smembers(familyKey);
			if (hashes.length === 0) return;
			const ops: Array<{ command: string; args: string[] }> = [];
			for (const hash of hashes) {
				ops.push({ command: "DEL", args: [authRedisKeys.refreshByHash(hash)] });
				ops.push({
					command: "DEL",
					args: [authRedisKeys.refreshSuperseded(hash)],
				});
			}
			ops.push({ command: "DEL", args: [familyKey] });
			await redis.transaction(ops);
		},

		async detectRefreshTokenReuse(rawToken) {
			const tokenHash = hashRefreshToken(rawToken);
			const supersededFamily = await redis.get(
				authRedisKeys.refreshSuperseded(tokenHash),
			);
			if (supersededFamily) return supersededFamily;

			const raw = await redis.get(authRedisKeys.refreshByHash(tokenHash));
			if (!raw) return null;
			const session = parseSession(raw, tokenHash);
			if (!session || session.expiresAt.getTime() > Date.now()) return null;
			return session.familyId;
		},

		async recordAuthAuditEvent(params) {
			if (options?.onAudit) {
				await options.onAudit(params);
			}
		},
	};

	return store;
}
