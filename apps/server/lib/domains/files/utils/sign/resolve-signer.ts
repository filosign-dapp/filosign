import { throwAppError } from "@filosign/errors/server";
import type { PlacementManifest } from "@filosign/shared";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import { primaryEmailForWallet } from "../../invites";
import { requireCanSign } from "../piece-helpers";

const { fileParticipants, fileSignatures, users } = db.schema;

export type ResolvedSigner = {
	signerWallet: Address;
	authProviderId: string;
	signerEmail: string;
};

export async function resolveSignerForPieceSign(args: {
	userWallet: Address;
	pieceCid: string;
	sender: Address;
	placementManifest: PlacementManifest;
	isSender: boolean;
}): Promise<ResolvedSigner> {
	const userWalletNorm = getAddress(args.userWallet);

	if (args.isSender) {
		return resolveSenderAsSigner(args);
	}

	const [participantRecord] = await db
		.select({
			wallet: fileParticipants.wallet,
			authProviderId: users.authProviderId,
		})
		.from(fileParticipants)
		.innerJoin(users, eq(fileParticipants.wallet, users.walletAddress))
		.where(
			and(
				eq(fileParticipants.filePieceCid, args.pieceCid),
				eq(fileParticipants.role, "signer"),
				eq(fileParticipants.wallet, userWalletNorm),
			),
		);

	if (!participantRecord) {
		throwAppError("SIGNING.NOT_REQUIRED");
	}

	await requireCanSign({
		wallet: args.userWallet,
		pieceCid: args.pieceCid,
		signAt: new Date(),
	});

	const signerWallet = getAddress(participantRecord.wallet);
	const email = await primaryEmailForWallet(participantRecord.wallet);
	if (!email) {
		throwAppError("SIGNING.EMAIL_REQUIRED");
	}

	return {
		signerWallet,
		authProviderId: participantRecord.authProviderId,
		signerEmail: email,
	};
}

async function resolveSenderAsSigner(args: {
	userWallet: Address;
	pieceCid: string;
	placementManifest: PlacementManifest;
}): Promise<ResolvedSigner> {
	const userWalletNorm = getAddress(args.userWallet);
	const senderEmail = await primaryEmailForWallet(userWalletNorm);
	if (!senderEmail) {
		throwAppError("SIGNING.EMAIL_REQUIRED");
	}

	const assignedForSender = args.placementManifest.fields.filter(
		(f) => f.assignedRecipientEmail === senderEmail,
	);
	if (assignedForSender.length === 0) {
		throwAppError("SIGNING.NOT_REQUIRED");
	}

	const [senderUser] = await db
		.select({ authProviderId: users.authProviderId })
		.from(users)
		.where(eq(users.walletAddress, userWalletNorm));

	if (!senderUser?.authProviderId) {
		throwAppError("SIGNING.NOT_REQUIRED");
	}

	const [existingSig] = await db
		.select({ signer: fileSignatures.signer })
		.from(fileSignatures)
		.where(
			and(
				eq(fileSignatures.filePieceCid, args.pieceCid),
				eq(fileSignatures.signer, userWalletNorm),
			),
		);
	if (existingSig) {
		throwAppError("SIGNING.ALREADY_SIGNED");
	}

	return {
		signerWallet: userWalletNorm,
		authProviderId: senderUser.authProviderId,
		signerEmail: senderEmail,
	};
}
