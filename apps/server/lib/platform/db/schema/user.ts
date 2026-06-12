import type {
	TypedSignatureMeta,
	UserKeygenDataJson,
	UserSignatureKind,
	UserSignatureRole,
} from "@filosign/shared";
import * as t from "drizzle-orm/pg-core";
import { tEvmAddress, timestamps } from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";

export const userInviteStatuses = [
	"pending",
	"claimed",
	"expired",
	"revoked",
] as const;
export type UserInviteStatus = (typeof userInviteStatuses)[number];

export const users = t.pgTable("users", {
	walletAddress: tEvmAddress().primaryKey(),
	keygenDataJson: t.jsonb().$type<UserKeygenDataJson>(),
	encryptionPublicKey: t.text().notNull(),
	signaturePublicKey: t.text().notNull(),

	authProviderId: t.text().unique().notNull(),
	email: t.text().unique().notNull(),
	mobile: t.text(),
	username: t.text().unique(),
	firstName: t.text(),
	lastName: t.text(),
	avatarKey: t.text(),
	invitedBy: tEvmAddress(),
	defaultSignatureId: t.uuid(),
	defaultInitialId: t.uuid(),

	...timestamps,
});

export const userInvites = t.pgTable(
	"user_invites",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		sender: tEvmAddress()
			.references(() => users.walletAddress, {
				onDelete: "cascade",
			})
			.notNull(),
		inviteeEmail: t.text().notNull(),
		status: t.text({ enum: userInviteStatuses }).notNull().default("pending"),
		expiresAt: t.timestamp({ withTimezone: true }).notNull(),
		claimedAt: t.timestamp({ withTimezone: true }),
		claimedByWallet: tEvmAddress().references(() => users.walletAddress),
		message: t.text(),

		...timestamps,
	},
	(table) => [
		t
			.index("idx_user_invites_status_expires")
			.on(table.status, table.expiresAt),
	],
);

export const userHistory = t.pgTable("user_history", {
	id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
	walletAddress: tEvmAddress()
		.references(() => users.walletAddress, {
			onDelete: "cascade",
		})
		.notNull(),
	fieldName: t.text().notNull(), // 'email' or 'username'
	oldValue: t.text().notNull(),
	newValue: t.text().notNull(),
	changedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),

	...timestamps,
});

export const userSignatureKinds = ["typed", "drawn", "uploaded"] as const;
export const userSignatureRoles = ["signature", "initial"] as const;

export const userSignatures = t.pgTable(
	"user_signatures",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		walletAddress: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress, { onDelete: "restrict" }),
		kind: t
			.text({ enum: userSignatureKinds })
			.$type<UserSignatureKind>()
			.notNull(),
		role: t
			.text({ enum: userSignatureRoles })
			.$type<UserSignatureRole>()
			.notNull(),
		storageKey: t.text().notNull(),
		contentType: t.text().notNull(),
		contentSha256: t.text().notNull(),
		typedMeta: t.jsonb().$type<TypedSignatureMeta>(),
		intrinsicAspectRatio: t.real(),

		...timestamps,
	},
	(table) => [
		t
			.index("idx_user_signatures_wallet_role_sha")
			.on(table.walletAddress, table.role, table.contentSha256),
	],
);
