import { randomBytes } from "node:crypto";
import { throwAppError } from "@filosign/errors/server";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq, ne, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	inviteExpiresAt,
	pendingOrgInviteFilter,
	previewOrgInvite,
} from "@/lib/domains/invites";
import {
	type ActiveOrgContext,
	assertOrgPermission,
	getOrgMemberWithDocumentRead,
} from "@/lib/domains/orgs";
import { syncOrgControllersAfterMembershipChange } from "@/lib/domains/orgs/utils/sync-controllers-after-membership";
import { invalidateOnMembershipChange } from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import type { OrgMemberRole } from "@/lib/platform/db/schema/organization";
import { sendWorkspaceInviteEmail } from "@/lib/platform/email";
import { getClientUrl } from "@/lib/platform/email/utils";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

const {
	organizationMembers,
	organizationMemberKeys,
	organizationSubscriptions,
	organizationInvites,
	organizations,
	users,
} = db.schema;

function displayNameFromProfile(row: {
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
}): string {
	const full = [row.firstName?.trim(), row.lastName?.trim()]
		.filter(Boolean)
		.join(" ");
	return full || row.email?.trim() || "A teammate";
}

async function loadWorkspaceInviteEmailContext(args: {
	organizationId: string;
	invitedBy: Address;
}) {
	const [orgRow] = await db
		.select({ name: organizations.name })
		.from(organizations)
		.where(eq(organizations.id, args.organizationId))
		.limit(1);

	const [inviter] = await db
		.select({
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
		})
		.from(users)
		.where(eq(users.walletAddress, getAddress(args.invitedBy)))
		.limit(1);

	return {
		orgName: orgRow?.name?.trim() || "your workspace",
		inviterName: displayNameFromProfile(inviter ?? {}),
	};
}

async function deliverWorkspaceInviteEmail(args: {
	to: string;
	token: string;
	organizationId: string;
	role: OrgMemberRole;
	expiresAt: Date;
	invitedBy: Address;
}): Promise<boolean> {
	const { orgName, inviterName } = await loadWorkspaceInviteEmailContext({
		organizationId: args.organizationId,
		invitedBy: args.invitedBy,
	});
	const appUrl = getClientUrl();
	const inviteUrl = `${appUrl.replace(/\/$/, "")}/?orgInvite=${encodeURIComponent(args.token)}`;
	const sendRes = await tryCatch(
		sendWorkspaceInviteEmail({
			to: args.to,
			inviteUrl,
			orgName,
			inviterName,
			role: args.role,
			expiresAt: args.expiresAt,
		}),
	);
	if (sendRes.error) {
		console.error("[email] workspace invite send failed", sendRes.error);
		return false;
	}
	return sendRes.data;
}

export const zOrgsKeysPublishWrapBody = z.object({
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
		throwAppError("WORKSPACE.NO_WRAPPED_KEY");
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
		throwAppError("WORKSPACE.NOT_MEMBER");
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
		throwAppError("WORKSPACE.NO_WRAPPED_KEY");
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
	const parsed = zOrgsKeysPublishWrapBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
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
		throwAppError("WORKSPACE.TARGET_NOT_ACTIVE_MEMBER");
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

export const zOrgsInviteCreateBody = z.object({
	email: z.string().min(3).max(320),
	role: zOrgMemberRole.optional().default("sender"),
});

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function assertOrgHasInviteSeat(
	organizationId: string,
	tx?: DbTx,
	options?: { excludePendingInviteId?: string },
) {
	const client = tx || db;
	const [sub] = await client
		.select({ seatCount: organizationSubscriptions.seatCount })
		.from(organizationSubscriptions)
		.where(eq(organizationSubscriptions.organizationId, organizationId))
		.limit(1);

	const seatCount = sub?.seatCount ?? 1;
	const [activeMembers] = await client
		.select({ count: sql<number>`count(*)::int` })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, organizationId),
				eq(organizationMembers.status, "active"),
			),
		);
	const [openInvites] = await client
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
		throwAppError("WORKSPACE.SEAT_LIMIT_EXCEEDED");
	}
}

export async function orgsInvitesCreate(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "members:invite");
	const parsed = zOrgsInviteCreateBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}
	if (parsed.data.role === "owner" && activeOrg.role !== "owner") {
		throwAppError("WORKSPACE.OWNER_INVITE_REQUIRED");
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
		throwAppError("WORKSPACE.INVITE_ALREADY_EXISTS");
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
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to create invite",
		});
	}

	const emailSent = await deliverWorkspaceInviteEmail({
		to: invite.email,
		token: invite.token ?? token,
		organizationId: activeOrg.organizationId,
		role: invite.role as OrgMemberRole,
		expiresAt: invite.expiresAt,
		invitedBy: getAddress(wallet),
	});

	return { invite, emailSent };
}

import { zDateWire } from "@/api/orpc/schemas/rpc-wire";
import { zOrgMemberRole } from "./schemas";

export const zOrgInvitePreviewOutput = z.object({
	valid: z.boolean(),
	lockedEmail: z.string().optional(),
	orgName: z.string().optional(),
	role: zOrgMemberRole.optional(),
	expiresAt: zDateWire.optional(),
	reason: z.string().optional(),
});

export async function orgsInvitesPreview(body: unknown) {
	const parsed = z.object({ token: z.string().min(16) }).safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	return previewOrgInvite({ token: parsed.data.token });
}

export const zOrgsInviteRevokeBody = z.object({
	inviteId: z.uuid(),
});

export async function orgsInvitesRevoke(
	_wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "members:invite");
	const parsed = zOrgsInviteRevokeBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	const [updated] = await db
		.update(organizationInvites)
		.set({
			status: "revoked",
			token: null,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(organizationInvites.id, parsed.data.inviteId),
				eq(organizationInvites.organizationId, activeOrg.organizationId),
				pendingOrgInviteFilter(),
			),
		)
		.returning({ id: organizationInvites.id });

	if (!updated) {
		throwAppError("WORKSPACE.INVITE_NOT_FOUND");
	}

	return { ok: true as const };
}

export const zOrgsInviteResendBody = z.object({
	inviteId: z.uuid(),
});

export async function orgsInvitesResend(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "members:invite");
	const parsed = zOrgsInviteResendBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	const [existing] = await db
		.select()
		.from(organizationInvites)
		.where(
			and(
				eq(organizationInvites.id, parsed.data.inviteId),
				eq(organizationInvites.organizationId, activeOrg.organizationId),
				pendingOrgInviteFilter(),
			),
		)
		.limit(1);

	if (!existing) {
		throwAppError("WORKSPACE.INVITE_NOT_FOUND");
	}

	const token = randomBytes(32).toString("hex");
	const expiresAt = inviteExpiresAt();

	const [invite] = await db
		.update(organizationInvites)
		.set({
			token,
			expiresAt,
			invitedBy: getAddress(wallet),
			updatedAt: new Date(),
		})
		.where(eq(organizationInvites.id, existing.id))
		.returning({
			id: organizationInvites.id,
			token: organizationInvites.token,
			expiresAt: organizationInvites.expiresAt,
			email: organizationInvites.email,
			role: organizationInvites.role,
		});

	if (!invite?.token) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to resend invite",
		});
	}

	const emailSent = await deliverWorkspaceInviteEmail({
		to: invite.email,
		token: invite.token,
		organizationId: activeOrg.organizationId,
		role: invite.role as OrgMemberRole,
		expiresAt: invite.expiresAt,
		invitedBy: getAddress(wallet),
	});

	return { invite, emailSent };
}

const zInviteAcceptBody = z.object({
	token: z.string().min(16),
});

async function loadInviteRowForAccept(token: string) {
	const [invite] = await db
		.select()
		.from(organizationInvites)
		.where(eq(organizationInvites.token, token))
		.limit(1);
	return invite ?? null;
}

export async function orgsInvitesAccept(wallet: Address, body: unknown) {
	const parsed = zInviteAcceptBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	const [profile] = await db
		.select({ email: users.email })
		.from(users)
		.where(eq(users.walletAddress, getAddress(wallet)))
		.limit(1);

	const rawEmail = profile?.email?.trim();
	if (!rawEmail) {
		throwAppError("WORKSPACE.EMAIL_REQUIRED_FOR_ACCEPT");
	}
	const emailNorm = normalizePlacementRecipientEmail(rawEmail);
	const invitee = getAddress(wallet);
	const token = parsed.data.token.trim();

	const invite = await loadInviteRowForAccept(token);
	if (!invite) {
		throwAppError("WORKSPACE.INVITE_NOT_FOUND");
	}
	if (invite.email !== emailNorm) {
		throwAppError("WORKSPACE.INVITE_EMAIL_MISMATCH");
	}

	if (invite.status === "claimed") {
		const claimedBy = invite.claimedByWallet
			? getAddress(invite.claimedByWallet)
			: null;
		if (!claimedBy || claimedBy !== invitee) {
			throwAppError("WORKSPACE.INVITE_NOT_FOUND");
		}
		await invalidateOnMembershipChange(invite.organizationId, invitee);
		await syncOrgControllersAfterMembershipChange(invite.organizationId);
		return { organizationId: invite.organizationId };
	}

	if (invite.status !== "pending" || invite.expiresAt.getTime() <= Date.now()) {
		throwAppError("WORKSPACE.INVITE_NOT_FOUND");
	}

	await db.transaction(async (tx) => {
		await assertOrgHasInviteSeat(invite.organizationId, tx, {
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
				updatedAt: new Date(),
			})
			.where(eq(organizationInvites.id, invite.id));
	});

	await invalidateOnMembershipChange(invite.organizationId, invitee);
	await syncOrgControllersAfterMembershipChange(invite.organizationId);
	return { organizationId: invite.organizationId };
}
