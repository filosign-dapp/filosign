import { ORPCError } from "@orpc/server";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import db from "@/lib/db";
import { bucket } from "@/lib/s3/client";

const { files, fileParticipants, shareApprovals } = db.schema;

export const zUploadStartBody = z.object({
	pieceCid: z.string().min(1),
});

export async function filesUploadStart(
	_sender: Address,
	input: z.infer<typeof zUploadStartBody>,
) {
	const pieceCid = input.pieceCid.trim();
	if (!pieceCid) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid pieceCid" });
	}
	const key = `uploads/${pieceCid}`;
	const uploadUrl = bucket.presign(key, {
		method: "PUT",
		expiresIn: 60,
		type: "application/octet-stream",
	});
	return { uploadUrl, key };
}

export async function filesListSent(userWallet: Address) {
	const sentFiles = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			status: sql<"foc">`'foc'`.as("status"),
		})
		.from(files)
		.where(eq(files.sender, userWallet));
	return { files: sentFiles };
}

export async function filesListReceived(userWallet: Address) {
	const receivedFiles = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			status: sql<"foc">`'foc'`.as("status"),
			encryptedEncryptionKey: fileParticipants.encryptedEncryptionKey,
			kemCiphertext: fileParticipants.kemCiphertext,
		})
		.from(files)
		.innerJoin(
			fileParticipants,
			eq(files.pieceCid, fileParticipants.filePieceCid),
		)
		.where(
			and(
				eq(fileParticipants.wallet, userWallet),
				ne(files.sender, userWallet),
			),
		);

	const approvalRows = await db
		.select({
			senderWallet: shareApprovals.senderWallet,
			active: shareApprovals.active,
		})
		.from(shareApprovals)
		.where(eq(shareApprovals.recipientWallet, userWallet))
		.orderBy(desc(shareApprovals.createdAt));

	const latestApprovalBySender = new Map<string, boolean>();
	for (const row of approvalRows) {
		const sender = getAddress(row.senderWallet).toLowerCase();
		if (!latestApprovalBySender.has(sender)) {
			latestApprovalBySender.set(sender, row.active);
		}
	}

	type ReceivedInboxEntry = (typeof receivedFiles)[number] & {
		inboxCategory: "primary" | "pending";
	};
	const primary: ReceivedInboxEntry[] = [];
	const pending: ReceivedInboxEntry[] = [];
	for (const file of receivedFiles) {
		const sender = getAddress(file.sender).toLowerCase();
		const isApproved = latestApprovalBySender.get(sender) === true;
		const entry = {
			...file,
			inboxCategory: isApproved ? ("primary" as const) : ("pending" as const),
		};
		if (isApproved) primary.push(entry);
		else pending.push(entry);
	}
	const categorizedFiles: ReceivedInboxEntry[] = [...primary, ...pending];
	return { files: categorizedFiles, primary, pending };
}

export async function filesListOrg(organizationId: string) {
	const orgFiles = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			organizationId: files.organizationId,
			status: sql<"foc">`'foc'`.as("status"),
			createdAt: files.createdAt,
		})
		.from(files)
		.where(eq(files.organizationId, organizationId))
		.orderBy(desc(files.createdAt));

	return { files: orgFiles };
}
