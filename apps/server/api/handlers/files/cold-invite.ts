import { FILE_ACK_COLD_CLAIM_SENTINEL_V1 } from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	coldInviteSenderLabel,
	primaryEmailForWallet,
	redactColdInviteRow,
} from "@/lib/domains/files";
import {
	inviteExpiresAt,
	pendingFileColdInviteFilter,
} from "@/lib/domains/invites";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/platform/analytics/events";
import { trackServerEvent } from "@/lib/platform/analytics/track";
import db from "@/lib/platform/db";
import { bucket } from "@/lib/platform/s3/client";

const {
	files,
	fileColdInvites,
	fileParticipants,
	fileAcknowledgements,
	users,
} = db.schema;

export async function filesColdInviteByToken(inviteToken: string) {
	if (!inviteToken || inviteToken.length < 8) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid invite" });
	}

	const rows = await db
		.select({
			inviteToken: fileColdInvites.inviteToken,
			email: fileColdInvites.email,
			wrappedEncryptionKey: fileColdInvites.wrappedEncryptionKey,
			expiresAt: fileColdInvites.expiresAt,
			isSigner: fileColdInvites.isSigner,
			pieceCid: files.pieceCid,
			sender: files.sender,
			placementManifestJson: files.placementManifestJson,
		})
		.from(fileColdInvites)
		.innerJoin(files, eq(fileColdInvites.filePieceCid, files.pieceCid))
		.where(
			and(
				eq(fileColdInvites.inviteToken, inviteToken),
				pendingFileColdInviteFilter(),
			),
		);

	if (rows.length === 0) {
		throw new ORPCError("NOT_FOUND", { message: "Invite not found" });
	}
	const [row] = rows;
	if (!row) {
		throw new ORPCError("NOT_FOUND", { message: "Invite not found" });
	}
	if (!row.inviteToken || !row.wrappedEncryptionKey) {
		throw new ORPCError("NOT_FOUND", { message: "Invite not found" });
	}

	const recipientEmails = [...new Set(rows.map((r) => r.email))];

	const key = `uploads/${row.pieceCid}`;
	if (!(await bucket.exists(key))) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}

	const downloadUrl = bucket.presign(key, {
		method: "GET",
		expiresIn: 60 * 5,
	});

	const [senderProfile] = await db
		.select({
			email: users.email,
			firstName: users.firstName,
			lastName: users.lastName,
		})
		.from(users)
		.where(eq(users.walletAddress, getAddress(row.sender as Address)));

	const senderLabel = coldInviteSenderLabel({
		senderWallet: row.sender,
		email: senderProfile?.email ?? null,
		firstName: senderProfile?.firstName ?? null,
		lastName: senderProfile?.lastName ?? null,
	});

	return {
		pieceCid: row.pieceCid,
		recipientEmails,
		wrappedEncryptionKey: row.wrappedEncryptionKey,
		isSigner: row.isSigner,
		sender: row.sender,
		senderLabel,
		placementManifest: row.placementManifestJson,
		expiresAt: row.expiresAt?.toISOString() ?? null,
		downloadUrl,
	};
}

const zColdClaimBody = z.object({
	kemCiphertext: zHexString(),
	encryptedEncryptionKey: zHexString(),
});

export async function filesColdInviteClaim(args: {
	userWallet: Address;
	inviteToken: string;
	body: unknown;
}) {
	const parsedBody = zColdClaimBody.safeParse(args.body);
	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
	}
	const inviteToken = args.inviteToken;
	if (!inviteToken || inviteToken.length < 8) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid invite" });
	}

	const userWallet = getAddress(args.userWallet);

	const profileEmail = await primaryEmailForWallet(userWallet);
	if (!profileEmail) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Add a primary email to your profile before claiming this invite",
		});
	}

	const [invite] = await db
		.select({
			id: fileColdInvites.id,
			filePieceCid: fileColdInvites.filePieceCid,
			email: fileColdInvites.email,
			isSigner: fileColdInvites.isSigner,
		})
		.from(fileColdInvites)
		.where(
			and(
				eq(fileColdInvites.inviteToken, inviteToken),
				eq(fileColdInvites.email, profileEmail),
				pendingFileColdInviteFilter(),
			),
		);
	if (!invite) {
		throw new ORPCError("NOT_FOUND", {
			message: "Invite not found for this account email",
		});
	}

	const now = new Date();
	await db.transaction(async (tx) => {
		await tx
			.insert(fileParticipants)
			.values({
				filePieceCid: invite.filePieceCid,
				wallet: userWallet,
				role: invite.isSigner ? "signer" : "viewer",
				kemCiphertext: parsedBody.data.kemCiphertext,
				encryptedEncryptionKey: parsedBody.data.encryptedEncryptionKey,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: [fileParticipants.filePieceCid, fileParticipants.wallet],
				set: {
					role: invite.isSigner ? "signer" : "viewer",
					kemCiphertext: parsedBody.data.kemCiphertext,
					encryptedEncryptionKey: parsedBody.data.encryptedEncryptionKey,
					updatedAt: now,
				},
			});

		await tx
			.update(fileColdInvites)
			.set(redactColdInviteRow(userWallet))
			.where(eq(fileColdInvites.id, invite.id));

		await tx
			.insert(fileAcknowledgements)
			.values({
				filePieceCid: invite.filePieceCid,
				wallet: userWallet,
				ack: FILE_ACK_COLD_CLAIM_SENTINEL_V1,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoNothing();
	});

	trackServerEvent({
		distinctId: userWallet,
		event: SERVER_ANALYTICS_EVENTS.coldInviteClaimed,
		pieceCid: invite.filePieceCid,
		properties: { is_signer: invite.isSigner },
	});
	// Cold claim inserts FILE_ACK_COLD_CLAIM_SENTINEL; sign UI skips warm ack.
	trackServerEvent({
		distinctId: userWallet,
		event: SERVER_ANALYTICS_EVENTS.pieceAcknowledged,
		pieceCid: invite.filePieceCid,
		properties: { mode: "cold" as const },
	});

	return {
		filePieceCid: invite.filePieceCid,
		role: invite.isSigner ? ("signer" as const) : ("viewer" as const),
	};
}

const zRegenerateColdBody = z.object({
	inviteToken: z.string().min(16),
	wrappedEncryptionKey: zHexString(),
});

export async function filesColdInviteRegenerate(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
}) {
	const parsedBody = zRegenerateColdBody.safeParse(args.body);
	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
	}
	const pieceCid = args.pieceCid.trim();
	const senderWallet = getAddress(args.userWallet);

	if (!pieceCid || pieceCid.length < 8) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid request" });
	}

	const [file] = await db
		.select({
			sender: files.sender,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);
	if (
		!file ||
		getAddress(file.sender as Address) !== getAddress(senderWallet)
	) {
		throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
	}

	const activeInvites = await db
		.select({
			email: fileColdInvites.email,
		})
		.from(fileColdInvites)
		.where(
			and(
				eq(fileColdInvites.filePieceCid, pieceCid),
				pendingFileColdInviteFilter(),
			),
		);
	if (activeInvites.length === 0) {
		throw new ORPCError("NOT_FOUND", {
			message: "No active cold invites found",
		});
	}

	const expiresAt = inviteExpiresAt();
	await db
		.update(fileColdInvites)
		.set({
			inviteToken: parsedBody.data.inviteToken,
			wrappedEncryptionKey: parsedBody.data.wrappedEncryptionKey,
			expiresAt,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(fileColdInvites.filePieceCid, pieceCid),
				pendingFileColdInviteFilter(),
			),
		);

	return {
		inviteToken: parsedBody.data.inviteToken,
		recipientEmails: activeInvites.map((row) => row.email),
		expiresAt: expiresAt.toISOString(),
	};
}
