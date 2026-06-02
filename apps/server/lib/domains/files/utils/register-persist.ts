import type { PlacementManifest, RegisterRoutingInput } from "@filosign/shared";
import type { Address } from "viem";
import { getAddress } from "viem";
import { inviteExpiresAt } from "@/lib/domains/invites";
import db from "@/lib/platform/db";

const { files, fileParticipants, fileColdInvites } = db.schema;

export type PersistRegisteredFileArgs = {
	pieceCid: string;
	sender: Address;
	organizationId: string;
	orgKemCiphertext: `0x${string}`;
	orgEncryptedEncryptionKey: `0x${string}`;
	onchainTxHash: `0x${string}`;
	registryAddress: Address;
	placementCommitment: `0x${string}`;
	placementManifest: PlacementManifest;
	registerRouting?: RegisterRoutingInput;
	warmParticipantCount: number;
	coldInviteCount: number;
	signerSlotCount: number;
	recipientSlotCount: number;
	displayName: string;
	mimeType: string;
	ciphertextByteLength: number;
	timestamp: number;
	participants: {
		address: Address;
		kemCiphertext: `0x${string}`;
		encryptedEncryptionKey: `0x${string}`;
		isSigner?: boolean;
	}[];
	senderKemCiphertext: `0x${string}`;
	senderEncryptedEncryptionKey: `0x${string}`;
	coldInvites: {
		email: string;
		inviteToken: string;
		wrappedEncryptionKey: `0x${string}`;
		isSigner: boolean;
	}[];
};

export type RegisterPersistTx = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

export async function persistRegisteredFileInTx(
	tx: RegisterPersistTx,
	args: PersistRegisteredFileArgs,
): Promise<void> {
	await tx
		.insert(files)
		.values({
			pieceCid: args.pieceCid,
			status: "s3",
			sender: args.sender,
			createdByWallet: getAddress(args.sender),
			organizationId: args.organizationId,
			orgKemCiphertext: args.orgKemCiphertext,
			orgEncryptedEncryptionKey: args.orgEncryptedEncryptionKey,
			onchainTxHash: args.onchainTxHash,
			registryAddress: args.registryAddress,
			placementCommitment: args.placementCommitment,
			placementManifestJson: args.placementManifest,
			registerRoutingJson: args.registerRouting ?? null,
			warmParticipantCount: args.warmParticipantCount,
			coldInviteCount: args.coldInviteCount,
			signerSlotCount: args.signerSlotCount,
			recipientSlotCount: args.recipientSlotCount,
			displayName: args.displayName,
			mimeType: args.mimeType,
			ciphertextByteLength: args.ciphertextByteLength,
			createdAt: new Date(args.timestamp * 1000),
		})
		.returning();

	await tx.insert(fileParticipants).values([
		{
			filePieceCid: args.pieceCid,
			wallet: getAddress(args.sender),
			role: "sender",
			kemCiphertext: args.senderKemCiphertext,
			encryptedEncryptionKey: args.senderEncryptedEncryptionKey,
		},
		...args.participants.map((p) => ({
			filePieceCid: args.pieceCid,
			wallet: getAddress(p.address),
			role: p.isSigner ? ("signer" as const) : ("viewer" as const),
			kemCiphertext: p.kemCiphertext,
			encryptedEncryptionKey: p.encryptedEncryptionKey,
		})),
	]);

	if (args.coldInvites.length > 0) {
		await tx.insert(fileColdInvites).values(
			args.coldInvites.map((c) => ({
				filePieceCid: args.pieceCid,
				email: c.email.trim().toLowerCase(),
				inviteToken: c.inviteToken,
				wrappedEncryptionKey: c.wrappedEncryptionKey,
				isSigner: c.isSigner,
				status: "pending" as const,
				expiresAt: inviteExpiresAt(),
			})),
		);
	}
}

export async function persistRegisteredFileInDb(
	args: PersistRegisteredFileArgs,
): Promise<void> {
	await db.transaction(async (tx) => {
		await persistRegisteredFileInTx(tx, args);
	});
}
