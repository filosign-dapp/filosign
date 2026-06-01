import type { PlanId } from "@filosign/entitlements";
import { ORPCError } from "@orpc/server";
import { and, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import env from "@/env";
import db from "@/lib/platform/db";
import { accessRequests } from "@/lib/platform/db/schema/platform-access";
import { sendAccessRequestApprovedEmail } from "@/lib/platform/email/invites";
import { createPlatformInvite } from "./platform-access-invites";
import { normalizeEmail, planLabel } from "./utils/shared";

export async function submitAccessRequest(args: {
	email: string;
	name?: string | null;
	company?: string | null;
	message?: string | null;
}): Promise<{ ok: true }> {
	const email = normalizeEmail(args.email);
	if (!email) {
		throw new ORPCError("BAD_REQUEST", { message: "Email is required" });
	}

	const [existingPending] = await db
		.select({ id: accessRequests.id })
		.from(accessRequests)
		.where(
			and(
				eq(accessRequests.email, email),
				eq(accessRequests.status, "pending"),
			),
		)
		.limit(1);

	if (existingPending) {
		return { ok: true };
	}

	await db.insert(accessRequests).values({
		email,
		name: args.name?.trim() || null,
		company: args.company?.trim() || null,
		message: args.message?.trim() || null,
	});

	return { ok: true };
}

export async function listAccessRequestsForAdmin() {
	const rows = await db
		.select({
			id: accessRequests.id,
			email: accessRequests.email,
			name: accessRequests.name,
			company: accessRequests.company,
			message: accessRequests.message,
			status: accessRequests.status,
			reviewedAt: accessRequests.reviewedAt,
			createdInviteId: accessRequests.createdInviteId,
			createdAt: accessRequests.createdAt,
		})
		.from(accessRequests)
		.orderBy(sql`${accessRequests.createdAt} desc`)
		.limit(200);

	return rows.map((row) => ({
		...row,
		reviewedAt: row.reviewedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
	}));
}

export async function approveAccessRequest(args: {
	adminWallet: Address;
	requestId: string;
	planId?: PlanId;
	trialDays?: number;
}): Promise<{ inviteToken: string; inviteUrl: string }> {
	const [request] = await db
		.select()
		.from(accessRequests)
		.where(eq(accessRequests.id, args.requestId))
		.limit(1);

	if (!request || request.status !== "pending") {
		throw new ORPCError("NOT_FOUND", { message: "Access request not found" });
	}

	const invite = await createPlatformInvite({
		adminWallet: args.adminWallet,
		kind: "partner_trial",
		planId: args.planId ?? "teams_pro",
		trialDays: args.trialDays ?? 30,
		email: request.email,
		note: request.company
			? `Approved waitlist: ${request.company}`
			: "Approved waitlist request",
	});

	await db
		.update(accessRequests)
		.set({
			status: "approved",
			reviewedAt: new Date(),
			reviewedByAdminWallet: getAddress(args.adminWallet),
			createdInviteId: invite.id,
			updatedAt: new Date(),
		})
		.where(eq(accessRequests.id, request.id));

	const inviteUrl = `${env.CLIENT_URL.replace(/\/$/, "")}/?platformInvite=${encodeURIComponent(invite.token)}`;

	await sendAccessRequestApprovedEmail({
		to: normalizeEmail(request.email),
		inviteUrl,
		planLabel: planLabel(invite.planId as PlanId),
		trialDays: invite.trialDays,
	});

	return { inviteToken: invite.token, inviteUrl };
}

export async function rejectAccessRequest(args: {
	adminWallet: Address;
	requestId: string;
}): Promise<void> {
	const [request] = await db
		.select({ id: accessRequests.id, status: accessRequests.status })
		.from(accessRequests)
		.where(eq(accessRequests.id, args.requestId))
		.limit(1);

	if (!request || request.status !== "pending") {
		throw new ORPCError("NOT_FOUND", { message: "Access request not found" });
	}

	await db
		.update(accessRequests)
		.set({
			status: "rejected",
			reviewedAt: new Date(),
			reviewedByAdminWallet: getAddress(args.adminWallet),
			updatedAt: new Date(),
		})
		.where(eq(accessRequests.id, request.id));
}
