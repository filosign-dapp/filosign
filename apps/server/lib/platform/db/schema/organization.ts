import { PLAN_IDS } from "@filosign/entitlements";
import { sql } from "drizzle-orm";
import * as t from "drizzle-orm/pg-core";
import { tEvmAddress, tHex, timestamps } from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { users } from "./user";

export const orgSigningModes = ["acting_member", "org_safe"] as const;
export type OrgSigningMode = (typeof orgSigningModes)[number];

export const orgMemberRoles = ["owner", "admin", "sender", "viewer"] as const;
export type OrgMemberRole = (typeof orgMemberRoles)[number];

export const orgMemberStatuses = ["invited", "active", "removed"] as const;
export type OrgMemberStatus = (typeof orgMemberStatuses)[number];

export const orgConnectionStatuses = ["active", "inactive"] as const;
export type OrgConnectionStatus = (typeof orgConnectionStatuses)[number];

export const orgInviteStatuses = [
	"pending",
	"claimed",
	"expired",
	"revoked",
] as const;
export type OrgInviteStatus = (typeof orgInviteStatuses)[number];

export const organizations = t.pgTable(
	"organizations",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		name: t.text().notNull(),
		slug: t.text().notNull().unique(),
		encryptionPublicKey: t.text().notNull(),
		createdByWallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		signingMode: t
			.text({ enum: orgSigningModes })
			.notNull()
			.default("acting_member"),
		orgWalletAddress: tEvmAddress(),
		orgWalletLinkedAt: t.timestamp({ withTimezone: true }),
		...timestamps,
	},
	(table) => [
		t.index("idx_organizations_created_by").on(table.createdByWallet),
	],
);

export const organizationMembers = t.pgTable(
	"organization_members",
	{
		organizationId: t
			.uuid()
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		walletAddress: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		role: t.text({ enum: orgMemberRoles }).notNull().default("sender"),
		status: t.text({ enum: orgMemberStatuses }).notNull().default("invited"),
		invitedBy: tEvmAddress().references(() => users.walletAddress),
		...timestamps,
	},
	(table) => [
		t.primaryKey({
			columns: [table.organizationId, table.walletAddress],
			name: "pk_organization_members",
		}),
		t.index("idx_org_members_wallet").on(table.walletAddress),
	],
);

export const organizationMemberKeys = t.pgTable(
	"organization_member_keys",
	{
		organizationId: t
			.uuid()
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		walletAddress: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		wrappedOmk: tHex().notNull(),
		/** Kyber ciphertext for decapsulation with the recipient's KEM private key. */
		wrapKemCiphertext: tHex().notNull(),
		wrappedByWallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		version: t.smallint().notNull().default(1),
		...timestamps,
	},
	(table) => [
		t.primaryKey({
			columns: [table.organizationId, table.walletAddress],
			name: "pk_organization_member_keys",
		}),
	],
);

export const organizationInvites = t.pgTable(
	"organization_invites",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		organizationId: t
			.uuid()
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		email: t.text().notNull(),
		role: t.text({ enum: orgMemberRoles }).notNull().default("sender"),
		token: t.text(),
		status: t.text({ enum: orgInviteStatuses }).notNull().default("pending"),
		claimedAt: t.timestamp({ withTimezone: true }),
		claimedByWallet: tEvmAddress().references(() => users.walletAddress),
		expiresAt: t.timestamp({ withTimezone: true }).notNull(),
		invitedBy: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		...timestamps,
	},
	(table) => [
		t.index("idx_org_invites_org").on(table.organizationId),
		t.index("idx_org_invites_email").on(table.email),
		t.index("idx_org_invites_status_expires").on(table.status, table.expiresAt),
		t
			.uniqueIndex("uidx_org_invites_pending_token")
			.on(table.token)
			.where(sql`${table.status} = 'pending'`),
	],
);

export const organizationConnections = t.pgTable(
	"organization_connections",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		organizationId: t
			.uuid()
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		recipientWallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		label: t.text(),
		addedByWallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		anchorSenderWallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		status: t.text({ enum: orgConnectionStatuses }).notNull().default("active"),
		...timestamps,
	},
	(table) => [
		t
			.uniqueIndex("uidx_org_connections_org_recipient")
			.on(table.organizationId, table.recipientWallet),
		t
			.index("idx_org_connections_org_status")
			.on(table.organizationId, table.status),
	],
);

export const organizationTemplates = t.pgTable(
	"organization_templates",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		organizationId: t
			.uuid()
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		name: t.text().notNull(),
		s3Key: t.text().notNull(),
		dekWrappedOmk: tHex().notNull(),
		placementManifestJson: t.jsonb().notNull(),
		createdByWallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		...timestamps,
	},
	(table) => [t.index("idx_org_templates_org").on(table.organizationId)],
);

export const organizationSubscriptions = t.pgTable(
	"organization_subscriptions",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		organizationId: t
			.uuid()
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" })
			.unique(),
		planId: t.text({ enum: PLAN_IDS }).notNull().default("free"),
		seatCount: t.integer().notNull().default(1),
		status: t.text().notNull().default("active"),
		provider: t.text().notNull().default("manual"),
		featureOverrides: t.jsonb().notNull().default({}),
		periodStart: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
		periodEnd: t.timestamp({ withTimezone: true }),
		...timestamps,
	},
	(table) => [t.index("idx_org_subscriptions_plan").on(table.planId)],
);
