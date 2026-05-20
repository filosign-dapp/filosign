import { and, eq, type InferInsertModel } from "drizzle-orm";
import { decodeEventLog, type Hash, isHex, type Log } from "viem";
import env from "@/env";
import { materializePendingInvitesForEmail } from "@/lib/domain/sharing";
import { activatePendingOrgConnectionsForApproval } from "@/lib/domain/sharing/org-connections";
import { syncSenderApprovalsFromChainForWallet } from "@/lib/domain/sharing/sync-chain-approvals";
import type { IndexerTxBodyParsed } from "@/lib/validation/tx-registration";
import db from "../db";
import { users } from "../db/schema/user";
import { evmClient, fsContracts } from "../evm";
import tryCatchSync, { tryCatch } from "../utils/tryCatch";
import { ProcessTxUserError } from "./errors";

const { shareApprovals, shareRequests, organizationConnections } = db.schema;
const { FSKeyRegistry, FSManager } = fsContracts;

async function handleKeygenDataRegistered(
	data: IndexerTxBodyParsed,
	log: {
		args: { user: `0x${string}` };
	},
): Promise<void> {
	const encryptionPublicKey = data.encryptionPublicKey?.trim();
	const signaturePublicKey = data.signaturePublicKey?.trim();
	const email = typeof data.email === "string" ? data.email.trim() : undefined;
	const privyDid =
		typeof data.privyDid === "string" ? data.privyDid.trim() : undefined;

	if (!encryptionPublicKey || !isHex(encryptionPublicKey)) {
		throw new ProcessTxUserError(
			"encryptionPublicKey is required for key registration and must be hex",
			400,
		);
	}
	if (!signaturePublicKey || !isHex(signaturePublicKey)) {
		throw new ProcessTxUserError(
			"signaturePublicKey is required for key registration and must be hex",
			400,
		);
	}

	const keygenData = await FSKeyRegistry.read.keygenData([log.args.user]);

	const [exists] = await db
		.select()
		.from(users)
		.where(eq(users.walletAddress, log.args.user));
	if (exists) return;

	await db.insert(users).values({
		walletAddress: log.args.user,
		encryptionPublicKey,
		signaturePublicKey,
		email: email || null,
		privyDid: privyDid || null,
		lastActiveAt: new Date(),
		keygenDataJson: {
			saltPin: keygenData[0],
			saltSeed: keygenData[1],
			saltChallenge: keygenData[2],
			commitmentKem: keygenData[3],
			commitmentSig: keygenData[4],
		},
	} as InferInsertModel<typeof users>);

	if (email?.trim()) {
		const inviteRes = await tryCatch(
			materializePendingInvitesForEmail({
				walletAddress: log.args.user,
				email: email.trim(),
			}),
		);
		if (inviteRes.error) {
			console.error(
				"materializePendingInvitesForEmail after registration:",
				inviteRes.error,
			);
		}
	}

	const syncRes = await tryCatch(
		syncSenderApprovalsFromChainForWallet(log.args.user),
	);
	if (syncRes.error) {
		console.error(
			"syncSenderApprovalsFromChainForWallet after registration:",
			syncRes.error,
		);
	}
}

async function processFsManagerLog(
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
		if (!encodedLog.transactionHash) {
			return;
		}

		const [recipientExists] = await db
			.select()
			.from(users)
			.where(eq(users.walletAddress, log.args.recipient))
			.limit(1);

		const [senderExists] = await db
			.select()
			.from(users)
			.where(eq(users.walletAddress, log.args.sender))
			.limit(1);

		if (!recipientExists || !senderExists) {
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

	if (log.eventName === "SenderRevoked") {
		const [recipientExists] = await db
			.select()
			.from(users)
			.where(eq(users.walletAddress, log.args.recipient))
			.limit(1);

		const [senderExists] = await db
			.select()
			.from(users)
			.where(eq(users.walletAddress, log.args.sender))
			.limit(1);

		if (!recipientExists || !senderExists) {
			return;
		}

		await db.insert(shareApprovals).values({
			recipientWallet: log.args.recipient,
			senderWallet: log.args.sender,
			active: false,
			txHash: txHash,
		});

		// Keep org connection allow-lists in sync with on-chain sender revoke events.
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
}

export async function processTransaction(
	txHash: Hash,
	data: IndexerTxBodyParsed,
) {
	const receipt = await evmClient.waitForTransactionReceipt({ hash: txHash });

	if (!receipt) {
		console.error("[indexer] waitForTransactionReceipt returned empty", {
			txHash,
		});
		throw new ProcessTxUserError(
			"Transaction receipt not available. Retry shortly.",
			502,
		);
	}

	if (receipt.status === "reverted") {
		throw new ProcessTxUserError(
			"Transaction reverted on-chain; nothing to index",
			400,
		);
	}

	if (
		[
			receipt.contractAddress?.toLowerCase(),
			receipt.to?.toLowerCase(),
		].includes(FSKeyRegistry.address.toLowerCase())
	) {
		for (const encodedLog of receipt.logs) {
			const decoded = tryCatchSync(() =>
				decodeEventLog({
					abi: FSKeyRegistry.abi,
					topics: encodedLog.topics,
					data: encodedLog.data,
				}),
			);
			if (decoded.error) {
				if (env.DEBUG) {
					console.error("FSKeyRegistry log decode skipped:", decoded.error);
				}
				continue;
			}
			const log = decoded.data;
			if (log.eventName === "KeygenDataRegistered") {
				const insertRes = await tryCatch(handleKeygenDataRegistered(data, log));
				if (insertRes.error) {
					console.error("[indexer] Keygen insert error:", insertRes.error);
					if (insertRes.error instanceof ProcessTxUserError)
						throw insertRes.error;
					throw new ProcessTxUserError(
						"Failed to persist registration profile",
						500,
					);
				}
			}
		}
	}

	if (
		[
			receipt.contractAddress?.toLowerCase(),
			receipt.to?.toLowerCase(),
		].includes(FSManager.address.toLowerCase())
	) {
		for (const encodedLog of receipt.logs) {
			await processFsManagerLog(txHash, encodedLog);
		}
	}
}
