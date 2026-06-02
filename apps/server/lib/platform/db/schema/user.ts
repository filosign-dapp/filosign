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
	keygenDataJson: t.jsonb(),
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

	...timestamps,
});

export const usersDatasets = t.pgTable("users_datasets", {
	walletAddress: tEvmAddress()
		.references(() => users.walletAddress, {
			onDelete: "cascade",
		})
		.primaryKey(),
	dataSetId: t.integer().notNull(),
	providerAddress: t.text().notNull(),
	totalDepositedBaseUnits: t
		.bigint({ mode: "bigint" })
		.notNull()
		.default(BigInt(0)),

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

export const userSignatures = t.pgTable("user_signatures", {
	id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
	walletAddress: tEvmAddress()
		.notNull()
		.references(() => users.walletAddress, { onDelete: "restrict" }),
	data: t.text().notNull(),

	...timestamps,
});
