import { and, desc, eq } from "drizzle-orm";
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

const { organizations, organizationMembers } = db.schema;

export type UserOrgRow = {
	id: string;
	name: string;
	slug: string;
	encryptionPublicKey: string;
	role: OrgMemberRole;
	status: OrgMemberStatus;
};

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
