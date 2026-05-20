import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/db";

const { organizationConnections, organizationMembers } = db.schema;

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
