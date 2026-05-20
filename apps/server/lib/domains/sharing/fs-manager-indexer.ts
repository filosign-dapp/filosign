import { and, eq } from "drizzle-orm";
import { decodeEventLog, type Hash, type Log } from "viem";
import env from "@/env";
import { activatePendingOrgConnectionsForApproval } from "@/lib/domains/sharing/org-connections";
import db from "@/lib/platform/db";
import { users } from "@/lib/platform/db/schema/user";
import { fsContracts } from "@/lib/platform/evm";
import tryCatchSync from "@/lib/platform/utils/tryCatch";

const { shareApprovals, shareRequests, organizationConnections } = db.schema;
const { FSManager } = fsContracts;

async function bothUsersExist(
	sender: `0x${string}`,
	recipient: `0x${string}`,
): Promise<boolean> {
	const [recipientExists] = await db
		.select()
		.from(users)
		.where(eq(users.walletAddress, recipient))
		.limit(1);

	const [senderExists] = await db
		.select()
		.from(users)
		.where(eq(users.walletAddress, sender))
		.limit(1);

	return Boolean(recipientExists && senderExists);
}

async function handleSenderApproved(
	log: {
		args: { sender: `0x${string}`; recipient: `0x${string}` };
	},
	encodedLog: Log,
): Promise<void> {
	if (!encodedLog.transactionHash) {
		return;
	}

	if (!(await bothUsersExist(log.args.sender, log.args.recipient))) {
		return;
	}

	const [approval] = await db
		.insert(shareApprovals)
		.values({
			recipientWallet: log.args.recipient,
			senderWallet: log.args.sender,
			txHash: encodedLog.transactionHash,
			active: true,
		})
		.returning({ id: shareApprovals.id });

	if (approval) {
		await activatePendingOrgConnectionsForApproval({
			anchorSender: log.args.sender,
			recipient: log.args.recipient,
			shareApprovalId: approval.id,
		});
	}

	await db
		.update(shareRequests)
		.set({ status: "ACCEPTED" })
		.where(
			and(
				eq(shareRequests.senderWallet, log.args.sender),
				eq(shareRequests.recipientWallet, log.args.recipient),
				eq(shareRequests.status, "PENDING"),
			),
		);
}

async function handleSenderRevoked(
	txHash: Hash,
	log: {
		args: { sender: `0x${string}`; recipient: `0x${string}` };
	},
): Promise<void> {
	if (!(await bothUsersExist(log.args.sender, log.args.recipient))) {
		return;
	}

	await db.insert(shareApprovals).values({
		recipientWallet: log.args.recipient,
		senderWallet: log.args.sender,
		active: false,
		txHash,
	});

	await db
		.update(organizationConnections)
		.set({
			status: "inactive",
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(organizationConnections.anchorSenderWallet, log.args.sender),
				eq(organizationConnections.recipientWallet, log.args.recipient),
			),
		);
}

export async function processFsManagerLogFromIndexer(
	txHash: Hash,
	encodedLog: Log,
): Promise<void> {
	const decodeRes = tryCatchSync(() =>
		decodeEventLog({
			abi: FSManager.abi,
			topics: encodedLog.topics,
			data: encodedLog.data,
		}),
	);
	if (decodeRes.error) {
		if (env.DEBUG) {
			console.error("FSManager log decode skipped:", decodeRes.error);
		}
		return;
	}
	const log = decodeRes.data;

	if (log.eventName === "SenderApproved") {
		await handleSenderApproved(log, encodedLog);
	}

	if (log.eventName === "SenderRevoked") {
		await handleSenderRevoked(txHash, log);
	}
}
