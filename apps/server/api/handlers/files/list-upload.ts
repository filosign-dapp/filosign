import { ORPCError } from "@orpc/server";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import type { Address } from "viem";
import z from "zod";
import db from "@/lib/platform/db";
import { bucket } from "@/lib/platform/s3/client";

const { files, fileParticipants, fileSignatures } = db.schema;

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

export async function filesAttachmentUploadStart(
	_sender: Address,
	input: { packetCid: string },
) {
	const packetCid = input.packetCid.trim();
	if (!packetCid) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid packetCid" });
	}
	const key = `uploads/attachments/${packetCid}`;
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
			status: files.status,
			displayName: files.displayName,
			mimeType: files.mimeType,
			ciphertextByteLength: files.ciphertextByteLength,
			createdAt: files.createdAt,
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
			status: files.status,
			displayName: files.displayName,
			mimeType: files.mimeType,
			ciphertextByteLength: files.ciphertextByteLength,
			createdAt: files.createdAt,
			encryptedEncryptionKey: fileParticipants.encryptedEncryptionKey,
			kemCiphertext: fileParticipants.kemCiphertext,
			signedByMe: sql<boolean>`${fileSignatures.signer} IS NOT NULL`,
		})
		.from(files)
		.innerJoin(
			fileParticipants,
			eq(files.pieceCid, fileParticipants.filePieceCid),
		)
		.leftJoin(
			fileSignatures,
			and(
				eq(fileSignatures.filePieceCid, files.pieceCid),
				eq(fileSignatures.signer, userWallet),
			),
		)
		.where(
			and(
				eq(fileParticipants.wallet, userWallet),
				ne(files.sender, userWallet),
			),
		);

	return { files: receivedFiles };
}

export async function filesListOrg(organizationId: string) {
	const orgFiles = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			organizationId: files.organizationId,
			status: files.status,
			displayName: files.displayName,
			mimeType: files.mimeType,
			ciphertextByteLength: files.ciphertextByteLength,
			createdAt: files.createdAt,
		})
		.from(files)
		.where(eq(files.organizationId, organizationId))
		.orderBy(desc(files.createdAt));

	return { files: orgFiles };
}
