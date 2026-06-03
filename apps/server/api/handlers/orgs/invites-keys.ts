import { randomBytes } from "node:crypto";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq, ne, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { inviteExpiresAt, pendingOrgInviteFilter } from "@/lib/domains/invites";
import {
	type ActiveOrgContext,
	assertOrgPermission,
	getOrgMemberWithDocumentRead,
	syncOrgControllersOnChain,
} from "@/lib/domains/orgs";
import { invalidateOnMembershipChange } from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import type { OrgMemberRole } from "@/lib/platform/db/schema/organization";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { zOrgMemberRole } from "./schemas";

const {
	organizationMembers,
	organizationMemberKeys,
	organizationSubscriptions,
	organizationInvites,
	users,
} = db.schema;

const zPublishWrapBody = z.object({
	targetWallet: zEvmAddress(),
	wrappedOmk: zHexString(),
	wrapKemCiphertext: zHexString(),
});

export async function orgsKeysMyWrap(
	wallet: Address,
	activeOrg: ActiveOrgContext,
) {
	const [row] = await db
		.select({
			wrappedOmk: organizationMemberKeys.wrappedOmk,
			wrapKemCiphertext: organizationMemberKeys.wrapKemCiphertext,
		})
		.from(organizationMemberKeys)
		.where(
			and(
				eq(organizationMemberKeys.organizationId, activeOrg.organizationId),
				eq(organizationMemberKeys.walletAddress, getAddress(wallet)),
			),
		)
		.limit(1);

	if (!row) {
		throw new ORPCError("NOT_FOUND", {
			message: "No wrapped org key for this account in this organization",
		});
	}

	return {
		wrappedOmk: row.wrappedOmk,
		wrapKemCiphertext: row.wrapKemCiphertext,
	};
}

/** Same payload as [`orgsKeysMyWrap`], keyed by explicit org ID (no `X-Org-Id`). */
export async function orgsKeysMyWrapForOrganization(
	wallet: Address,
	organizationId: string,
) {
	const can = await getOrgMemberWithDocumentRead(wallet, organizationId);
	if (!can) {
		throw new ORPCError("FORBIDDEN", {
			message: "Not a member of this organization",
		});
	}

	const [row] = await db
		.select({
			wrappedOmk: organizationMemberKeys.wrappedOmk,
			wrapKemCiphertext: organizationMemberKeys.wrapKemCiphertext,
		})
		.from(organizationMemberKeys)
		.where(
			and(
				eq(organizationMemberKeys.organizationId, organizationId),
				eq(organizationMemberKeys.walletAddress, getAddress(wallet)),
			),
		)
		.limit(1);

	if (!row) {
		throw new ORPCError("NOT_FOUND", {
			message: "No wrapped org key for this account in this organization",
		});
	}

	return {
		wrappedOmk: row.wrappedOmk,
		wrapKemCiphertext: row.wrapKemCiphertext,
	};
}

export async function orgsKeysPublishWrap(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "members:invite");
	const parsed = zPublishWrapBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	const target = getAddress(parsed.data.targetWallet);
	const [member] = await db
		.select()
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, activeOrg.organizationId),
				eq(organizationMembers.walletAddress, target),
				eq(organizationMembers.status, "active"),
			),
		)
		.limit(1);

	if (!member) {
		throw new ORPCError("NOT_FOUND", {
			message: "Target is not an active member",
		});
	}

	await db
		.insert(organizationMemberKeys)
		.values({
			organizationId: activeOrg.organizationId,
			walletAddress: target,
			wrappedOmk: parsed.data.wrappedOmk,
			wrapKemCiphertext: parsed.data.wrapKemCiphertext,
			wrappedByWallet: getAddress(wallet),
		})
		.onConflictDoUpdate({
			target: [
				organizationMemberKeys.organizationId,
				organizationMemberKeys.walletAddress,
			],
			set: {
				wrappedOmk: parsed.data.wrappedOmk,
				wrapKemCiphertext: parsed.data.wrapKemCiphertext,
				wrappedByWallet: getAddress(wallet),
				updatedAt: new Date(),
			},
		});

	return { ok: true as const };
}

const zInviteCreateBody = z.object({
	email: z.string().min(3).max(320),
	role: zOrgMemberRole.optional().default("sender"),
});

async function assertOrgHasInviteSeat(
	organizationId: string,
	options?: { excludePendingInviteId?: string },
) {
	const [sub] = await db
		.select({ seatCount: organizationSubscriptions.seatCount })
		.from(organizationSubscriptions)
		.where(eq(organizationSubscriptions.organizationId, organizationId))
		.limit(1);

	const seatCount = sub?.seatCount ?? 1;
	const [activeMembers] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, organizationId),
				eq(organizationMembers.status, "active"),
			),
		);
	const [openInvites] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(organizationInvites)
		.where(
			options?.excludePendingInviteId
				? and(
						eq(organizationInvites.organizationId, organizationId),
						pendingOrgInviteFilter(),
						ne(organizationInvites.id, options.excludePendingInviteId),
					)
				: and(
						eq(organizationInvites.organizationId, organizationId),
						pendingOrgInviteFilter(),
					),
		);

	const used = (activeMembers?.count ?? 0) + (openInvites?.count ?? 0);
	if (used >= seatCount) {
		throw new ORPCError("FORBIDDEN", {
			message: "SEAT_LIMIT: organization has no available seats",
		});
	}
}

export async function orgsInvitesCreate(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "members:invite");
	const parsed = zInviteCreateBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}
	if (parsed.data.role === "owner" && activeOrg.role !== "owner") {
		throw new ORPCError("FORBIDDEN", {
			message: "Only organization owners can invite members as owners",
		});
	}
	const emailNorm = normalizePlacementRecipientEmail(parsed.data.email.trim());

	const existing = await db
		.select({ id: organizationInvites.id })
		.from(organizationInvites)
		.where(
			and(
				eq(organizationInvites.organizationId, activeOrg.organizationId),
				eq(organizationInvites.email, emailNorm),
				pendingOrgInviteFilter(),
			),
		)
		.limit(1);
	if (existing.length > 0) {
		throw new ORPCError("CONFLICT", {
			message: "An active invite already exists for this email",
		});
	}

	const token = randomBytes(32).toString("hex");
	const expiresAt = inviteExpiresAt();
	await assertOrgHasInviteSeat(activeOrg.organizationId);

	const [invite] = await db
		.insert(organizationInvites)
		.values({
			organizationId: activeOrg.organizationId,
			email: emailNorm,
			role: parsed.data.role as OrgMemberRole,
			token,
			status: "pending",
			expiresAt,
			invitedBy: getAddress(wallet),
		})
		.returning({
			id: organizationInvites.id,
			token: organizationInvites.token,
			expiresAt: organizationInvites.expiresAt,
			email: organizationInvites.email,
			role: organizationInvites.role,
		});

	if (!invite) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to create invite",
		});
	}

	return { invite };
}

const zInviteAcceptBody = z.object({
	token: z.string().min(16),
});

export async function orgsInvitesAccept(wallet: Address, body: unknown) {
	const parsed = zInviteAcceptBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	const [profile] = await db
		.select({ email: users.email })
		.from(users)
		.where(eq(users.walletAddress, getAddress(wallet)))
		.limit(1);

	const rawEmail = profile?.email?.trim();
	if (!rawEmail) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Add a primary email to your Filosign profile before accepting",
		});
	}
	const emailNorm = normalizePlacementRecipientEmail(rawEmail);

	const [invite] = await db
		.select()
		.from(organizationInvites)
		.where(
			and(
				eq(organizationInvites.token, parsed.data.token),
				pendingOrgInviteFilter(),
			),
		)
		.limit(1);

	if (!invite) {
		throw new ORPCError("NOT_FOUND", {
			message: "Invite not found or expired",
		});
	}
	if (invite.email !== emailNorm) {
		throw new ORPCError("FORBIDDEN", {
			message: "Invite email does not match your Filosign profile email",
		});
	}

	const invitee = getAddress(wallet);

	await db.transaction(async (tx) => {
		await assertOrgHasInviteSeat(invite.organizationId, {
			excludePendingInviteId: invite.id,
		});
		await tx
			.insert(organizationMembers)
			.values({
				organizationId: invite.organizationId,
				walletAddress: invitee,
				role: invite.role,
				status: "active",
				invitedBy: invite.invitedBy,
			})
			.onConflictDoUpdate({
				target: [
					organizationMembers.organizationId,
					organizationMembers.walletAddress,
				],
				set: {
					role: invite.role,
					status: "active",
					invitedBy: invite.invitedBy,
					updatedAt: new Date(),
				},
			});

		await tx
			.update(organizationInvites)
			.set({
				status: "claimed",
				claimedAt: new Date(),
				claimedByWallet: invitee,
				token: null,
				updatedAt: new Date(),
			})
			.where(eq(organizationInvites.id, invite.id));
	});

	await invalidateOnMembershipChange(invite.organizationId, invitee);
	const syncRes = await tryCatch(
		syncOrgControllersOnChain(invite.organizationId),
	);
	if (syncRes.error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to sync organization controllers on-chain",
		});
	}
	return { organizationId: invite.organizationId };
}
