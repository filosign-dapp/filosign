import {
	type AuthAuditParams,
	type AuthConfig,
	type AuthStore,
	hashRefreshToken,
	type RefreshSession,
} from "@filosign/auth";
import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";
import db from "@/lib/platform/db";
import {
	authAuditEvents,
	authNonces,
	jwtRevokedJtis,
	refreshSessions,
} from "@/lib/platform/db/schema";
export function createPostgresAuthStore(config: AuthConfig): AuthStore {
	return {
		async upsertAuthNonce(walletAddress, nonce) {
			const expiresAt = new Date(Date.now() + config.nonceTtlMs);
			await db
				.insert(authNonces)
				.values({ walletAddress, nonce, expiresAt })
				.onConflictDoUpdate({
					target: authNonces.walletAddress,
					set: { nonce, expiresAt },
				});
		},

		async takeAuthNonce(walletAddress) {
			const now = new Date();
			const rows = await db
				.delete(authNonces)
				.where(
					and(
						eq(authNonces.walletAddress, walletAddress),
						gt(authNonces.expiresAt, now),
					),
				)
				.returning({ nonce: authNonces.nonce });
			return rows[0]?.nonce ?? null;
		},

		async revokeAccessJti(jti, expiresAt) {
			await db
				.insert(jwtRevokedJtis)
				.values({ jti, expiresAt })
				.onConflictDoNothing();
		},

		async isAccessJtiRevoked(jti) {
			const now = new Date();
			const rows = await db
				.select({ jti: jwtRevokedJtis.jti })
				.from(jwtRevokedJtis)
				.where(
					and(eq(jwtRevokedJtis.jti, jti), gt(jwtRevokedJtis.expiresAt, now)),
				)
				.limit(1);
			return rows.length > 0;
		},

		async createRefreshSession({ walletAddress, rawToken, userAgent }) {
			const familyId = crypto.randomUUID();
			const tokenHash = hashRefreshToken(rawToken);
			const expiresAt = new Date(
				Date.now() + config.refreshExpirationSeconds * 1000,
			);
			const [row] = await db
				.insert(refreshSessions)
				.values({
					walletAddress,
					familyId,
					tokenHash,
					expiresAt,
					userAgent: userAgent ?? null,
				})
				.returning({
					id: refreshSessions.id,
					familyId: refreshSessions.familyId,
				});
			return { familyId: row.familyId, sessionId: row.id };
		},

		async findActiveRefreshSession(rawToken) {
			const tokenHash = hashRefreshToken(rawToken);
			const now = new Date();
			const rows = await db
				.select()
				.from(refreshSessions)
				.where(
					and(
						eq(refreshSessions.tokenHash, tokenHash),
						isNull(refreshSessions.revokedAt),
						gt(refreshSessions.expiresAt, now),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return null;
			return mapRefreshRow(row);
		},

		async rotateRefreshSession({ session, newRawToken }) {
			const newHash = hashRefreshToken(newRawToken);
			await db
				.update(refreshSessions)
				.set({
					supersededTokenHash: session.tokenHash,
					tokenHash: newHash,
					updatedAt: new Date(),
				})
				.where(eq(refreshSessions.id, session.id));
		},

		async revokeRefreshFamily(familyId) {
			await db
				.update(refreshSessions)
				.set({ revokedAt: new Date(), updatedAt: new Date() })
				.where(eq(refreshSessions.familyId, familyId));
		},

		async detectRefreshTokenReuse(rawToken) {
			const tokenHash = hashRefreshToken(rawToken);
			const superseded = await db
				.select({ familyId: refreshSessions.familyId })
				.from(refreshSessions)
				.where(eq(refreshSessions.supersededTokenHash, tokenHash))
				.limit(1);
			if (superseded[0]) return superseded[0].familyId;

			const revoked = await db
				.select({ familyId: refreshSessions.familyId })
				.from(refreshSessions)
				.where(
					and(
						eq(refreshSessions.tokenHash, tokenHash),
						isNotNull(refreshSessions.revokedAt),
					),
				)
				.limit(1);
			if (revoked[0]) return revoked[0].familyId;

			return null;
		},

		async recordAuthAuditEvent(params) {
			await insertAuthAudit(params);
		},
	};
}

function mapRefreshRow(
	row: typeof refreshSessions.$inferSelect,
): RefreshSession {
	return {
		id: row.id,
		walletAddress: row.walletAddress,
		familyId: row.familyId,
		tokenHash: row.tokenHash,
		expiresAt: row.expiresAt,
		userAgent: row.userAgent,
	};
}

async function insertAuthAudit(params: AuthAuditParams): Promise<void> {
	await db.insert(authAuditEvents).values({
		event: params.event,
		walletAddress: params.walletAddress,
		ip: params.ip ?? null,
		userAgent: params.userAgent ?? null,
		detail: params.detail ?? null,
	});
}
