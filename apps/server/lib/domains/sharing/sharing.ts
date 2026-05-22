import { and, desc, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { pendingUserInviteFilter } from "@/lib/domains/invites";
import db from "@/lib/platform/db";

const {
	organizationConnections,
	organizationMembers,
	shareApprovals,
	shareRequests,
	userInvites,
} = db.schema;

export async function orgCanSendToRecipient(args: {
	organizationId: string;
	recipient: Address;
}): Promise<boolean> {
	const recipient = getAddress(args.recipient);
	const [row] = await db
		.select({ status: organizationConnections.status })
		.from(organizationConnections)
		.where(
			and(
				eq(organizationConnections.organizationId, args.organizationId),
				eq(organizationConnections.recipientWallet, recipient),
				eq(organizationConnections.status, "active"),
			),
		)
		.limit(1);
	return Boolean(row);
}

export async function listOrgSendableRecipients(
	organizationId: string,
): Promise<{ recipientWallet: string }[]> {
	return db
		.select({ recipientWallet: organizationConnections.recipientWallet })
		.from(organizationConnections)
		.where(
			and(
				eq(organizationConnections.organizationId, organizationId),
				eq(organizationConnections.status, "active"),
			),
		);
}

/** Activate all pending org connections for an on-chain sender approval pair. */
export async function activatePendingOrgConnectionsForApproval(args: {
	anchorSender: Address;
	recipient: Address;
	shareApprovalId: string;
}) {
	const anchor = getAddress(args.anchorSender);
	const recipient = getAddress(args.recipient);
	const pending = await db
		.select({ organizationId: organizationConnections.organizationId })
		.from(organizationConnections)
		.where(
			and(
				eq(organizationConnections.anchorSenderWallet, anchor),
				eq(organizationConnections.recipientWallet, recipient),
				eq(organizationConnections.status, "pending_approval"),
			),
		);

	for (const conn of pending) {
		await activateOrgConnectionForApproval({
			organizationId: conn.organizationId,
			anchorSender: anchor,
			recipient,
			shareApprovalId: args.shareApprovalId,
		});
	}
}

export async function activateOrgConnectionForApproval(args: {
	organizationId: string;
	anchorSender: Address;
	recipient: Address;
	shareApprovalId: string;
}) {
	await db
		.update(organizationConnections)
		.set({
			status: "active",
			shareApprovalId: args.shareApprovalId,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(organizationConnections.organizationId, args.organizationId),
				eq(
					organizationConnections.anchorSenderWallet,
					getAddress(args.anchorSender),
				),
				eq(organizationConnections.recipientWallet, getAddress(args.recipient)),
			),
		);
}

export async function isActiveOrgMember(
	organizationId: string,
	wallet: Address,
): Promise<boolean> {
	const [row] = await db
		.select({ status: organizationMembers.status })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, organizationId),
				eq(organizationMembers.walletAddress, getAddress(wallet)),
				eq(organizationMembers.status, "active"),
			),
		)
		.limit(1);
	return Boolean(row);
}

/** Pending email invites → share requests when the user registers with that email. */
export async function materializePendingInvitesForEmail(args: {
	walletAddress: Address;
	email: string;
}): Promise<void> {
	const normalized = args.email.trim().toLowerCase();
	if (!normalized) return;

	await db.transaction(async (tx) => {
		const invites = await tx
			.select()
			.from(userInvites)
			.where(
				and(
					sql`lower(${userInvites.inviteeEmail}) = ${normalized}`,
					pendingUserInviteFilter(),
				),
			);

		for (const invite of invites) {
			await tx.insert(shareRequests).values({
				senderWallet: invite.sender,
				recipientWallet: args.walletAddress,
				message:
					invite.message ??
					`Auto-generated request from invite to ${invite.inviteeEmail}`,
				createdAt: invite.createdAt,
			});
			await tx
				.update(userInvites)
				.set({
					status: "claimed",
					claimedAt: new Date(),
					claimedByWallet: args.walletAddress,
					updatedAt: new Date(),
				})
				.where(eq(userInvites.id, invite.id));
		}
	});
}

/** Optional reciprocal share request after an on-chain approval (mutual trust). */
export async function ensureReciprocalShareRequest(args: {
	approverWallet: Address;
	counterpartyWallet: Address;
}): Promise<{ created: boolean }> {
	const B = getAddress(args.approverWallet);
	const A = getAddress(args.counterpartyWallet);

	if (B === A) {
		return { created: false };
	}

	const [reverseApproval] = await db
		.select()
		.from(shareApprovals)
		.where(
			and(
				eq(shareApprovals.senderWallet, B),
				eq(shareApprovals.recipientWallet, A),
			),
		)
		.orderBy(desc(shareApprovals.createdAt))
		.limit(1);

	if (reverseApproval?.active) {
		return { created: false };
	}

	const [pendingReverse] = await db
		.select({ id: shareRequests.id })
		.from(shareRequests)
		.where(
			and(
				eq(shareRequests.senderWallet, B),
				eq(shareRequests.recipientWallet, A),
				eq(shareRequests.status, "PENDING"),
			),
		)
		.limit(1);

	if (pendingReverse) {
		return { created: false };
	}

	await db.insert(shareRequests).values({
		senderWallet: B,
		recipientWallet: A,
		message: "Complete mutual sharing",
	});

	return { created: true };
}
