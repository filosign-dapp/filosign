import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import type { OrgMemberRole } from "@/lib/platform/db/schema/organization";
import { type OrgPermission, orgRoleHasPermission } from "./permissions";

const { organizationMembers, organizations } = db.schema;

export type ActiveOrgContext = {
	organizationId: string;
	role: OrgMemberRole;
	encryptionPublicKey: string;
	signingMode: "acting_member" | "org_safe";
};

export async function resolveActiveOrg(
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

	if (!row) {
		throw new ORPCError("FORBIDDEN", {
			message: "Not an active member of this organization",
		});
	}

	return {
		organizationId: row.organizationId,
		role: row.role as OrgMemberRole,
		encryptionPublicKey: row.encryptionPublicKey,
		signingMode: row.signingMode as "acting_member" | "org_safe",
	};
}

export function assertOrgPermission(
	activeOrg: ActiveOrgContext | null,
	permission: OrgPermission,
): asserts activeOrg is ActiveOrgContext {
	if (!activeOrg) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Organization context required (X-Org-Id header)",
		});
	}
	if (!orgRoleHasPermission(activeOrg.role, permission)) {
		throw new ORPCError("FORBIDDEN", {
			message: `Missing permission: ${permission}`,
		});
	}
}

export function readOrgIdHeader(
	headerValue: string | undefined,
): string | undefined {
	const v = headerValue?.trim();
	return v && v.length > 0 ? v : undefined;
}
