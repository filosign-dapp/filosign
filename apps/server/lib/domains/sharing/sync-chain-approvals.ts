import { and, desc, eq } from "drizzle-orm";
import type { Address, Hash } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import { evmClient, fsContracts } from "@/lib/platform/evm";
import { activatePendingOrgConnectionsForApproval } from "./org-connections";

const { shareApprovals, organizationConnections, users } = db.schema;
const { FSManager } = fsContracts;

type ApprovalPair = {
	recipient: Address;
	sender: Address;
	lastTxHash: Hash;
};

function pairKey(recipient: Address, sender: Address): string {
	return `${recipient.toLowerCase()}:${sender.toLowerCase()}`;
}

async function walletIsRegistered(wallet: Address): Promise<boolean> {
	const [row] = await db
		.select({ walletAddress: users.walletAddress })
		.from(users)
		.where(eq(users.walletAddress, wallet))
		.limit(1);
	return Boolean(row);
}

/**
 * After a wallet registers, reconcile share approvals and org connections with
 * on-chain FSManager state (covers indexer skips when events arrived early).
 */
export async function syncSenderApprovalsFromChainForWallet(
	wallet: Address,
): Promise<void> {
	const focus = getAddress(wallet);
	const managerAddress = FSManager.address;

	const [approvedRecipient, approvedSender, revokedRecipient, revokedSender] =
		await Promise.all([
			evmClient.getContractEvents({
				address: managerAddress,
				abi: FSManager.abi,
				eventName: "SenderApproved",
				args: { recipient: focus },
				fromBlock: 0n,
				toBlock: "latest",
			}),
			evmClient.getContractEvents({
				address: managerAddress,
				abi: FSManager.abi,
				eventName: "SenderApproved",
				args: { sender: focus },
				fromBlock: 0n,
				toBlock: "latest",
			}),
			evmClient.getContractEvents({
				address: managerAddress,
				abi: FSManager.abi,
				eventName: "SenderRevoked",
				args: { recipient: focus },
				fromBlock: 0n,
				toBlock: "latest",
			}),
			evmClient.getContractEvents({
				address: managerAddress,
				abi: FSManager.abi,
				eventName: "SenderRevoked",
				args: { sender: focus },
				fromBlock: 0n,
				toBlock: "latest",
			}),
		]);

	const allLogs = [
		...approvedRecipient,
		...approvedSender,
		...revokedRecipient,
		...revokedSender,
	].sort((a, b) => {
		if (a.blockNumber !== b.blockNumber) {
			return a.blockNumber < b.blockNumber ? -1 : 1;
		}
		return a.logIndex - b.logIndex;
	});

	const pairs = new Map<string, ApprovalPair>();
	for (const log of allLogs) {
		const recipientRaw = log.args.recipient;
		const senderRaw = log.args.sender;
		if (!recipientRaw || !senderRaw) continue;
		const recipient = getAddress(recipientRaw);
		const sender = getAddress(senderRaw);
		const tx = log.transactionHash;
		if (!tx) continue;
		pairs.set(pairKey(recipient, sender), {
			recipient,
			sender,
			lastTxHash: tx,
		});
	}

	for (const { recipient, sender, lastTxHash } of pairs.values()) {
		const [recipientOk, senderOk] = await Promise.all([
			walletIsRegistered(recipient),
			walletIsRegistered(sender),
		]);
		if (!recipientOk || !senderOk) continue;

		const approvedOnChain = await FSManager.read.approvedSenders([
			recipient,
			sender,
		]);

		const [latest] = await db
			.select({ id: shareApprovals.id, active: shareApprovals.active })
			.from(shareApprovals)
			.where(
				and(
					eq(shareApprovals.recipientWallet, recipient),
					eq(shareApprovals.senderWallet, sender),
				),
			)
			.orderBy(desc(shareApprovals.createdAt))
			.limit(1);

		if (latest?.active === approvedOnChain) {
			if (approvedOnChain && latest) {
				await activatePendingOrgConnectionsForApproval({
					anchorSender: sender,
					recipient,
					shareApprovalId: latest.id,
				});
			}
			continue;
		}

		const [inserted] = await db
			.insert(shareApprovals)
			.values({
				recipientWallet: recipient,
				senderWallet: sender,
				active: approvedOnChain,
				txHash: lastTxHash,
			})
			.onConflictDoNothing()
			.returning({ id: shareApprovals.id });

		const approvalId = inserted?.id ?? latest?.id;
		if (approvedOnChain && approvalId) {
			await activatePendingOrgConnectionsForApproval({
				anchorSender: sender,
				recipient,
				shareApprovalId: approvalId,
			});
		}

		if (!approvedOnChain) {
			await db
				.update(organizationConnections)
				.set({ status: "inactive", updatedAt: new Date() })
				.where(
					and(
						eq(organizationConnections.anchorSenderWallet, sender),
						eq(organizationConnections.recipientWallet, recipient),
					),
				);
		}
	}
}
