import * as t from "drizzle-orm/pg-core";
import { tEvmAddress, tHex, timestamps } from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";

/** Dilithium handshake nonce per wallet (replaces in-process Record). */
export const authNonces = t.pgTable("auth_nonces", {
	walletAddress: tEvmAddress().primaryKey(),
	nonce: tHex().notNull(),
	expiresAt: t.timestamp({ withTimezone: true }).notNull(),
});

/** Access JWT `jti` denylist until natural `exp`. */
export const jwtRevokedJtis = t.pgTable("jwt_revoked_jtis", {
	jti: t.text().primaryKey(),
	expiresAt: t.timestamp({ withTimezone: true }).notNull(),
});

/** Rotating refresh sessions (httpOnly cookie holds raw token; DB stores hash). */
export const refreshSessions = t.pgTable(
	"refresh_sessions",
	{
		id: t
			.uuid()
			.primaryKey()
			.$defaultFn(() => randomUuidV7()),
		walletAddress: tEvmAddress().notNull(),
		familyId: t.uuid().notNull(),
		tokenHash: t.text().notNull().unique(),
		/** Previous hash after rotation — reuse signals theft. */
		supersededTokenHash: t.text(),
		expiresAt: t.timestamp({ withTimezone: true }).notNull(),
		revokedAt: t.timestamp({ withTimezone: true }),
		userAgent: t.text(),
		...timestamps,
	},
	(table) => [
		t.index("refresh_sessions_wallet_idx").on(table.walletAddress),
		t.index("refresh_sessions_family_idx").on(table.familyId),
	],
);

/** Optional audit trail for failed auth (Phase 3). */
export const authAuditEvents = t.pgTable("auth_audit_events", {
	id: t
		.uuid()
		.primaryKey()
		.$defaultFn(() => randomUuidV7()),
	event: t.text().notNull(),
	walletAddress: tEvmAddress(),
	ip: t.text(),
	userAgent: t.text(),
	detail: t.text(),
	createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
});
