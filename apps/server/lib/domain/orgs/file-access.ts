import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/db";
import type { OrgMemberRole } from "@/lib/db/schema/organization";
import { orgRoleHasPermission } from "./permissions";

const { organizationMembers } = db.schema;

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
