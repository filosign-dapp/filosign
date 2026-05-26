import { and, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { pendingUserInviteFilter } from "@/lib/domains/invites";
import db from "@/lib/platform/db";

const { organizationConnections, organizationMembers, userInvites } = db.schema;

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

/** Claim pending email invites when the user registers with that email. */
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
