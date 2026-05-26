import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { getOrgMemberWithDocumentRead } from "@/lib/domains/orgs";
import db from "@/lib/platform/db";

const { files, fileAcknowledgements, fileParticipants, fileSignatures, users } =
	db.schema;

export async function pieceDetail(userWallet: Address, pieceCid: string) {
	const [fileRecord] = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			organizationId: files.organizationId,
			orgKemCiphertext: files.orgKemCiphertext,
			orgEncryptedEncryptionKey: files.orgEncryptedEncryptionKey,
			status: files.status,
			onchainTxHash: files.onchainTxHash,
			createdAt: files.createdAt,
			placementCommitment: files.placementCommitment,
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	const participants = await db
		.select({
			wallet: fileParticipants.wallet,
			role: fileParticipants.role,
			kemCiphertext: fileParticipants.kemCiphertext,
			encryptedEncryptionKey: fileParticipants.encryptedEncryptionKey,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
			username: users.username,
		})
		.from(fileParticipants)
		.leftJoin(users, eq(fileParticipants.wallet, users.walletAddress))
		.where(eq(fileParticipants.filePieceCid, pieceCid));

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}
	const userWalletNorm = getAddress(userWallet);
	const participantUser = participants.find(
		(p) => getAddress(p.wallet) === userWalletNorm,
	);

	const orgRead =
		!participantUser &&
		fileRecord.organizationId &&
		(await getOrgMemberWithDocumentRead(
			userWalletNorm,
			fileRecord.organizationId,
		));

	if (!participantUser && !orgRead) {
		throw new ORPCError("FORBIDDEN", {
			message: "You dont have access to this file",
		});
	}

	const fileSignaturesRecord = await db
		.select({
			signer: fileSignatures.signer,
			timestamp: fileSignatures.createdAt,
			onchainTxHash: fileSignatures.onchainTxHash,
		})
		.from(fileSignatures)
		.where(eq(fileSignatures.filePieceCid, pieceCid));

	const signers = participants
		.filter((p) => p.role === "signer")
		.map((p) => ({
			wallet: getAddress(p.wallet),
			name:
				[p.firstName, p.lastName].filter(Boolean).join(" ") ||
				p.username ||
				null,
			email: p.email || null,
		}))
		.sort((a, b) => a.wallet.localeCompare(b.wallet));

	const viewers = participants
		.filter((p) => p.role === "viewer")
		.map((p) => ({
			wallet: getAddress(p.wallet),
			name:
				[p.firstName, p.lastName].filter(Boolean).join(" ") ||
				p.username ||
				null,
			email: p.email || null,
		}))
		.sort((a, b) => a.wallet.localeCompare(b.wallet));

	const [acked] = await db
		.select()
		.from(fileAcknowledgements)
		.where(
			and(
				eq(fileAcknowledgements.filePieceCid, pieceCid),
				eq(fileAcknowledgements.wallet, userWalletNorm),
			),
		);
	const isSender = getAddress(fileRecord.sender) === userWalletNorm;
	const canReadParticipant = participantUser && (!!acked || isSender);
	const canReadOrg = Boolean(orgRead);

	return {
		pieceCid: fileRecord.pieceCid,
		sender: fileRecord.sender,
		status: fileRecord.status,
		onchainTxHash: fileRecord.onchainTxHash,
		createdAt: fileRecord.createdAt,
		placementCommitment: fileRecord.placementCommitment,
		placementManifest: fileRecord.placementManifestJson,
		signers,
		viewers,
		signatures: fileSignaturesRecord,

		kemCiphertext:
			canReadParticipant && participantUser
				? participantUser.kemCiphertext
				: null,
		encryptedEncryptionKey:
			canReadParticipant && participantUser
				? participantUser.encryptedEncryptionKey
				: null,
		orgKemCiphertext: canReadOrg ? fileRecord.orgKemCiphertext : null,
		orgEncryptedEncryptionKey: canReadOrg
			? fileRecord.orgEncryptedEncryptionKey
			: null,
		organizationId: canReadOrg ? fileRecord.organizationId : null,
	};
}
