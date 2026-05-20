import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress, isAddress } from "viem";
import z from "zod";
import type { ActiveOrgContext } from "@/lib/domains/orgs";
import { ensureReciprocalShareRequest } from "@/lib/domains/sharing";
import {
	activatePendingOrgConnectionsForApproval,
	listOrgSendableRecipients,
	orgCanSendToRecipient,
} from "@/lib/domains/sharing/org-connections";
import db from "@/lib/platform/db";
import { evmClient, fsContracts } from "@/lib/platform/evm";
import { processTransaction } from "@/lib/platform/indexer/process";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { shareApprovals, shareRequests } = db.schema;
const { FSManager } = fsContracts;

export async function sharingCanSendTo(
	sender: Address,
	recipient: string,
	activeOrg: ActiveOrgContext | null = null,
) {
	if (!recipient || !isAddress(recipient)) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid recipient" });
	}
	const recipientAddr = getAddress(recipient);
	if (recipientAddr === sender) {
		return { canSend: false, reason: "Cannot send to yourself" as const };
	}
	const [latestApproval] = await db
		.select()
		.from(shareApprovals)
		.where(
			and(
				eq(shareApprovals.senderWallet, sender),
				eq(shareApprovals.recipientWallet, recipientAddr),
			),
		)
		.orderBy(desc(shareApprovals.createdAt))
		.limit(1);
	let canSend = latestApproval ? latestApproval.active : false;
	if (!canSend && activeOrg) {
		canSend = await orgCanSendToRecipient({
			organizationId: activeOrg.organizationId,
			recipient: recipientAddr,
		});
	}
	return {
		canSend,
		reason: canSend ? null : ("No active approval" as const),
	};
}

const zApproveBody = z.object({
	sender: zEvmAddress(),
	nonce: z.coerce.bigint(),
	deadline: z.coerce.bigint(),
	signature: zHexString(),
	establishMutualConnection: z.boolean().optional(),
	shareRequestId: z.uuid().optional(),
});

export async function sharingApprove(wallet: Address, body: unknown) {
	const recipient = wallet;
	const parsedBody = zApproveBody.safeParse(body ?? {});

	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
	}

	const {
		sender,
		nonce,
		deadline,
		signature,
		establishMutualConnection,
		shareRequestId,
	} = parsedBody.data;

	const senderAddr = getAddress(sender);

	if (establishMutualConnection && shareRequestId) {
		const [matchingRequest] = await db
			.select()
			.from(shareRequests)
			.where(eq(shareRequests.id, shareRequestId));

		if (
			!matchingRequest ||
			getAddress(matchingRequest.senderWallet) !== senderAddr ||
			getAddress(matchingRequest.recipientWallet) !== recipient ||
			matchingRequest.status !== "PENDING"
		) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"shareRequestId does not match a pending incoming request for this approval",
			});
		}
	}

	const args = [recipient, senderAddr, nonce, deadline, signature] as const;

	const sim = await tryCatch(
		FSManager.simulate.approveSender(args, {
			account: evmClient.account.address,
		}),
	);
	if (sim.error) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid signature" });
	}

	const txHash = await FSManager.write.approveSender(args);
	await processTransaction(txHash, {});

	const [latestApproval] = await db
		.select({ id: shareApprovals.id })
		.from(shareApprovals)
		.where(
			and(
				eq(shareApprovals.senderWallet, senderAddr),
				eq(shareApprovals.recipientWallet, getAddress(recipient)),
			),
		)
		.orderBy(desc(shareApprovals.createdAt))
		.limit(1);

	if (latestApproval) {
		await activatePendingOrgConnectionsForApproval({
			anchorSender: senderAddr,
			recipient: getAddress(recipient),
			shareApprovalId: latestApproval.id,
		});
	}

	let reciprocalCreated = false;
	if (establishMutualConnection) {
		const out = await ensureReciprocalShareRequest({
			approverWallet: recipient,
			counterpartyWallet: senderAddr,
		});
		reciprocalCreated = out.created;
	}

	return { txHash, reciprocalCreated };
}

export async function sharingReceivableFrom(wallet: Address) {
	const subquery = db
		.select({
			senderWallet: shareApprovals.senderWallet,
			maxCreatedAt: sql<Date>`max(${shareApprovals.createdAt})`.as(
				"maxCreatedAt",
			),
		})
		.from(shareApprovals)
		.where(eq(shareApprovals.recipientWallet, wallet))
		.groupBy(shareApprovals.senderWallet)
		.as("subquery");

	const approvals = await db
		.select({
			senderWallet: shareApprovals.senderWallet,
			active: shareApprovals.active,
			createdAt: shareApprovals.createdAt,
		})
		.from(shareApprovals)
		.innerJoin(
			subquery,
			and(
				eq(shareApprovals.senderWallet, subquery.senderWallet),
				eq(shareApprovals.createdAt, subquery.maxCreatedAt),
			),
		);

	return { approvals };
}

export async function sharingSendableTo(
	wallet: Address,
	activeOrg: ActiveOrgContext | null = null,
) {
	const subquery = db
		.select({
			recipientWallet: shareApprovals.recipientWallet,
			maxCreatedAt: sql<Date>`max(${shareApprovals.createdAt})`.as(
				"maxCreatedAt",
			),
		})
		.from(shareApprovals)
		.where(eq(shareApprovals.senderWallet, wallet))
		.groupBy(shareApprovals.recipientWallet)
		.as("subquery");

	const approvals = await db
		.select({
			recipientWallet: shareApprovals.recipientWallet,
			active: shareApprovals.active,
			createdAt: shareApprovals.createdAt,
		})
		.from(shareApprovals)
		.innerJoin(
			subquery,
			and(
				eq(shareApprovals.recipientWallet, subquery.recipientWallet),
				eq(shareApprovals.createdAt, subquery.maxCreatedAt),
			),
		);

	const merged = new Map<
		string,
		{ recipientWallet: string; active: boolean; createdAt: number }
	>();
	for (const a of approvals) {
		merged.set(getAddress(a.recipientWallet).toLowerCase(), {
			recipientWallet: getAddress(a.recipientWallet),
			active: a.active,
			createdAt: a.createdAt,
		});
	}

	if (activeOrg) {
		const orgRows = await listOrgSendableRecipients(activeOrg.organizationId);
		for (const r of orgRows) {
			const key = getAddress(r.recipientWallet).toLowerCase();
			if (!merged.has(key)) {
				merged.set(key, {
					recipientWallet: getAddress(r.recipientWallet),
					active: true,
					createdAt: 0,
				});
			} else {
				const prev = merged.get(key);
				if (prev) merged.set(key, { ...prev, active: true });
			}
		}
	}

	return { approvals: [...merged.values()] };
}
