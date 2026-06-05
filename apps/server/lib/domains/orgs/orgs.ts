import { throwAppError } from "@filosign/errors/server";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import {
	CACHE_TTL,
	cacheAside,
	cacheKeys,
	defaultDeserialize,
	defaultSerialize,
} from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import type {
	OrgMemberRole,
	OrgMemberStatus,
} from "@/lib/platform/db/schema/organization";

const { files, organizations, organizationMembers, organizationTemplates } =
	db.schema;

export type OrgPermission =
	| "org:manage"
	| "members:invite"
	| "members:remove"
	| "templates:write"
	| "templates:use"
	| "documents:send"
	| "documents:read:org"
	| "drafts:read"
	| "drafts:write"
	| "drafts:share"
	| "connections:manage"
	| "connections:request"
	| "connections:view"
	| "billing:manage";

const ROLE_PERMISSIONS: Record<OrgMemberRole, ReadonlySet<OrgPermission>> = {
	owner: new Set([
		"org:manage",
		"members:invite",
		"members:remove",
		"templates:write",
		"templates:use",
		"documents:send",
		"documents:read:org",
		"drafts:read",
		"drafts:write",
		"drafts:share",
		"connections:manage",
		"connections:request",
		"connections:view",
		"billing:manage",
	]),
	admin: new Set([
		"org:manage",
		"members:invite",
		"members:remove",
		"templates:write",
		"templates:use",
		"documents:send",
		"documents:read:org",
		"drafts:read",
		"drafts:write",
		"drafts:share",
		"connections:manage",
		"connections:request",
		"connections:view",
		"billing:manage",
	]),
	sender: new Set([
		"templates:use",
		"documents:send",
		"documents:read:org",
		"drafts:read",
		"drafts:write",
		"drafts:share",
		"connections:request",
		"connections:view",
	]),
	viewer: new Set([
		"templates:use",
		"documents:read:org",
		"drafts:read",
		"connections:view",
	]),
};

export type ActiveOrgContext = {
	organizationId: string;
	role: OrgMemberRole;
	encryptionPublicKey: string;
	signingMode: "acting_member" | "org_safe";
};

export type UserOrgRow = {
	id: string;
	name: string;
	slug: string;
	encryptionPublicKey: string;
	orgWalletAddress: string | null;
	role: OrgMemberRole;
	status: OrgMemberStatus;
};

export type OrgTemplateListRow = {
	id: string;
	name: string;
	createdAt: Date;
	createdByWallet: string;
};

type StoredTemplateRow = Omit<OrgTemplateListRow, "createdAt"> & {
	createdAt: string;
};

export function orgRoleHasPermission(
	role: OrgMemberRole,
	permission: OrgPermission,
): boolean {
	return ROLE_PERMISSIONS[role].has(permission);
}

export function slugifyOrgName(name: string): string {
	const base = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
	return base.length > 0 ? base : "org";
}

async function fetchActiveOrg(
	wallet: Address,
	organizationIdHeader: string | undefined,
): Promise<ActiveOrgContext | null> {
	if (!organizationIdHeader?.trim()) return null;

	const walletNorm = getAddress(wallet);
	const orgId = organizationIdHeader.trim();

	const [row] = await db
		.select({
			organizationId: organizationMembers.organizationId,
			role: organizationMembers.role,
			status: organizationMembers.status,
			encryptionPublicKey: organizations.encryptionPublicKey,
			signingMode: organizations.signingMode,
		})
		.from(organizationMembers)
		.innerJoin(
			organizations,
			eq(organizations.id, organizationMembers.organizationId),
		)
		.where(
			and(
				eq(organizationMembers.organizationId, orgId),
				eq(organizationMembers.walletAddress, walletNorm),
				eq(organizationMembers.status, "active"),
			),
		)
		.limit(1);

	if (!row) return null;

	return {
		organizationId: row.organizationId,
		role: row.role as OrgMemberRole,
		encryptionPublicKey: row.encryptionPublicKey,
		signingMode: row.signingMode as "acting_member" | "org_safe",
	};
}

export async function resolveActiveOrg(
	wallet: Address,
	organizationIdHeader: string | undefined,
): Promise<ActiveOrgContext | null> {
	if (!organizationIdHeader?.trim()) return null;

	const walletNorm = getAddress(wallet);
	const orgId = organizationIdHeader.trim();

	return cacheAside({
		key: cacheKeys.orgMember(orgId, walletNorm),
		ttlSec: CACHE_TTL.orgMember,
		fetch: () => fetchActiveOrg(wallet, organizationIdHeader),
		serialize: defaultSerialize,
		deserialize: defaultDeserialize,
	});
}

export function assertOrgPermission(
	activeOrg: ActiveOrgContext | null,
	permission: OrgPermission,
): asserts activeOrg is ActiveOrgContext {
	if (!activeOrg) {
		throw throwAppError("WORKSPACE.ORG_CONTEXT_REQUIRED");
	}
	if (!orgRoleHasPermission(activeOrg.role, permission)) {
		throw throwAppError("WORKSPACE.NOT_MEMBER");
	}
}

export function readOrgIdHeader(
	headerValue: string | undefined,
): string | undefined {
	const v = headerValue?.trim();
	return v && v.length > 0 ? v : undefined;
}

export async function assertOrganizationDeletionAllowed(
	organizationId: string,
): Promise<void> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(files)
		.where(eq(files.organizationId, organizationId));

	if ((row?.count ?? 0) > 0) {
		throw throwAppError("WORKSPACE.DELETION_NOT_ALLOWED");
	}
}

export async function getOrgMemberWithDocumentRead(
	wallet: Address,
	organizationId: string,
): Promise<{ role: OrgMemberRole } | null> {
	const walletNorm = getAddress(wallet);
	const [row] = await db
		.select({ role: organizationMembers.role })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, organizationId),
				eq(organizationMembers.walletAddress, walletNorm),
				eq(organizationMembers.status, "active"),
			),
		)
		.limit(1);
	if (!row || !orgRoleHasPermission(row.role, "documents:read:org")) {
		return null;
	}
	return { role: row.role };
}

export async function fetchUserOrgs(
	wallet: Address,
): Promise<{ organizations: UserOrgRow[] }> {
	const walletNorm = getAddress(wallet);
	const rows = await db
		.select({
			id: organizations.id,
			name: organizations.name,
			slug: organizations.slug,
			encryptionPublicKey: organizations.encryptionPublicKey,
			orgWalletAddress: organizations.orgWalletAddress,
			role: organizationMembers.role,
			status: organizationMembers.status,
		})
		.from(organizationMembers)
		.innerJoin(
			organizations,
			eq(organizations.id, organizationMembers.organizationId),
		)
		.where(
			and(
				eq(organizationMembers.walletAddress, walletNorm),
				eq(organizationMembers.status, "active"),
			),
		)
		.orderBy(desc(organizations.createdAt));

	return {
		organizations: rows.map((row) => ({
			...row,
			role: row.role as OrgMemberRole,
			status: row.status as OrgMemberStatus,
		})),
	};
}

export async function listUserOrgsCached(
	wallet: Address,
): Promise<{ organizations: UserOrgRow[] }> {
	return cacheAside({
		key: cacheKeys.userOrgs(getAddress(wallet)),
		ttlSec: CACHE_TTL.userOrgs,
		fetch: () => fetchUserOrgs(wallet),
		serialize: defaultSerialize,
		deserialize: defaultDeserialize,
	});
}

function serializeTemplates(rows: OrgTemplateListRow[]): string {
	const stored: StoredTemplateRow[] = rows.map((row) => ({
		...row,
		createdAt: row.createdAt.toISOString(),
	}));
	return defaultSerialize(stored);
}

function deserializeTemplates(raw: string): OrgTemplateListRow[] {
	const stored = defaultDeserialize<StoredTemplateRow[]>(raw);
	return stored.map((row) => ({
		...row,
		createdAt: new Date(row.createdAt),
	}));
}

export async function fetchOrgTemplatesList(
	organizationId: string,
): Promise<OrgTemplateListRow[]> {
	return db
		.select({
			id: organizationTemplates.id,
			name: organizationTemplates.name,
			createdAt: organizationTemplates.createdAt,
			createdByWallet: organizationTemplates.createdByWallet,
		})
		.from(organizationTemplates)
		.where(eq(organizationTemplates.organizationId, organizationId))
		.orderBy(desc(organizationTemplates.createdAt));
}

export async function listOrgTemplatesCached(
	organizationId: string,
): Promise<OrgTemplateListRow[]> {
	return cacheAside({
		key: cacheKeys.orgTemplates(organizationId),
		ttlSec: CACHE_TTL.orgTemplates,
		fetch: () => fetchOrgTemplatesList(organizationId),
		serialize: serializeTemplates,
		deserialize: deserializeTemplates,
	});
}
