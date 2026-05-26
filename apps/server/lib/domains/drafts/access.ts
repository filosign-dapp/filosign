import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import {
	type ActiveOrgContext,
	assertOrgPermission,
	orgRoleHasPermission,
} from "@/lib/domains/orgs";
import db from "@/lib/platform/db";

const { envelopeDrafts, organizationMembers } = db.schema;

export type DraftRow = typeof envelopeDrafts.$inferSelect;

export async function loadDraftOrThrow(draftId: string): Promise<DraftRow> {
	const [row] = await db
		.select()
		.from(envelopeDrafts)
		.where(eq(envelopeDrafts.id, draftId))
		.limit(1);
	if (!row) {
		throw new ORPCError("NOT_FOUND", { message: "Draft not found" });
	}
	return row;
}

export async function assertDraftCreator(
	wallet: Address,
	draft: DraftRow,
): Promise<void> {
	if (getAddress(draft.createdByWallet) !== getAddress(wallet)) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the draft creator can perform this action",
		});
	}
}

export async function assertCanReadDraft(args: {
	wallet: Address;
	draft: DraftRow;
	activeOrg: ActiveOrgContext;
}): Promise<void> {
	const walletNorm = getAddress(args.wallet);
	if (getAddress(args.draft.createdByWallet) === walletNorm) return;

	if (args.activeOrg.organizationId !== args.draft.organizationId) {
		throw new ORPCError("FORBIDDEN", {
			message: "Switch to the draft organization to access it",
		});
	}
	assertOrgPermission(args.activeOrg, "drafts:read");
	const [member] = await db
		.select({ role: organizationMembers.role })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, args.draft.organizationId),
				eq(organizationMembers.walletAddress, walletNorm),
				eq(organizationMembers.status, "active"),
			),
		)
		.limit(1);
	if (!member || !orgRoleHasPermission(member.role, "drafts:read")) {
		throw new ORPCError("FORBIDDEN", { message: "No draft access" });
	}
}

export async function listDraftsForWallet(args: {
	wallet: Address;
	organizationId: string;
}) {
	return db
		.select({
			id: envelopeDrafts.id,
			organizationId: envelopeDrafts.organizationId,
			title: envelopeDrafts.title,
			status: envelopeDrafts.status,
			revision: envelopeDrafts.revision,
			createdByWallet: envelopeDrafts.createdByWallet,
			createdAt: envelopeDrafts.createdAt,
			updatedAt: envelopeDrafts.updatedAt,
			sentPieceCid: envelopeDrafts.sentPieceCid,
		})
		.from(envelopeDrafts)
		.where(
			and(
				eq(envelopeDrafts.organizationId, args.organizationId),
				eq(envelopeDrafts.status, "active"),
			),
		)
		.orderBy(desc(envelopeDrafts.updatedAt));
}
