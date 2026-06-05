import { throwAppError } from "@filosign/errors/server";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	inviteExpiresAt,
	pendingFileColdInviteFilter,
} from "@/lib/domains/invites";
import {
	SERVER_ANALYTICS_EVENTS,
	trackServerEvent,
} from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import { bucket } from "@/lib/platform/s3/client";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

const {
	files,
	fileColdInvites,
	fileParticipants,
	users,
	envelopeAttachmentPackets,
	envelopeAttachmentPacketColdWraps,
} = db.schema;

export const zColdInviteClaimBody = z.object({
	kemCiphertext: zHexString(),
	encryptedEncryptionKey: zHexString(),
});

export const zColdInviteRegenerateBody = z.object({
	inviteToken: z.string().min(16),
	wrappedEncryptionKey: zHexString(),
});

export function redactColdInviteRow(claimedByWallet: Address) {
	return {
		status: "claimed" as const,
		claimedAt: new Date(),
		claimedByWallet,
		inviteToken: null,
		wrappedEncryptionKey: null,
		updatedAt: new Date(),
	};
}

export function isSenderAlreadyApprovedError(err: unknown): boolean {
	const msg = err instanceof Error ? err.message : String(err);
	return msg.includes("SenderAlreadyApproved");
}

export async function primaryEmailForWallet(
	wallet: Address,
): Promise<string | null> {
	const [row] = await db
		.select({ email: users.email })
		.from(users)
		.where(eq(users.walletAddress, getAddress(wallet)));
	const e = row?.email?.trim();
	return e ? normalizePlacementRecipientEmail(e) : null;
}

export function coldInviteSenderLabel(args: {
	senderWallet: string;
	email: string | null | undefined;
	firstName: string | null | undefined;
	lastName: string | null | undefined;
}): string {
	const email = args.email?.trim();
	const parts = [args.firstName?.trim(), args.lastName?.trim()].filter(
		(x): x is string => Boolean(x && x.length > 0),
	);
	const name = parts.join(" ");
	if (name && email) return `${name} (${email})`;
	if (email) return email;
	return `${args.senderWallet.slice(0, 6)}…${args.senderWallet.slice(-4)}`;
}

export async function normalizedViewerEmailsForRegister(args: {
	participants: { address: string; isSigner?: boolean }[];
	coldInvites: { email: string; isSigner: boolean }[];
}): Promise<string[]> {
	const emails = new Set<string>();

	const viewerWallets = args.participants
		.filter((p) => !p.isSigner)
		.map((p) => getAddress(p.address as Address));

	if (viewerWallets.length > 0) {
		const rows = await db
			.select({ email: users.email })
			.from(users)
			.where(inArray(users.walletAddress, viewerWallets));
		for (const row of rows) {
			const e = row.email?.trim();
			if (e) emails.add(normalizePlacementRecipientEmail(e));
		}
	}

	for (const invite of args.coldInvites) {
		if (!invite.isSigner && invite.email.trim()) {
			emails.add(normalizePlacementRecipientEmail(invite.email.trim()));
		}
	}

	return [...emails];
}

export async function filesColdInviteByToken(inviteToken: string) {
	if (!inviteToken || inviteToken.length < 8) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "Invalid invite token",
					path: ["inviteToken"],
				},
			]),
		);
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
		throwAppError("FILES.INVITE_NOT_FOUND");
	}
	const [row] = rows;
	if (!row) {
		throwAppError("FILES.INVITE_NOT_FOUND");
	}
	if (!row.inviteToken || !row.wrappedEncryptionKey) {
		throwAppError("FILES.INVITE_NOT_FOUND");
	}

	const recipientEmails = [...new Set(rows.map((r) => r.email))];

	const key = `uploads/${row.pieceCid}`;
	if (!(await bucket.exists(key))) {
		throwAppError("FILES.NOT_FOUND");
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

	const entitledPackets = await db
		.select({
			packetId: envelopeAttachmentPackets.packetId,
			label: envelopeAttachmentPackets.label,
			packetCid: envelopeAttachmentPackets.packetCid,
			releaseMode: envelopeAttachmentPackets.releaseMode,
			wrappedPacketDek: envelopeAttachmentPacketColdWraps.wrappedPacketDek,
		})
		.from(envelopeAttachmentPacketColdWraps)
		.innerJoin(
			envelopeAttachmentPackets,
			eq(
				envelopeAttachmentPacketColdWraps.packetRowId,
				envelopeAttachmentPackets.id,
			),
		)
		.where(
			and(
				eq(envelopeAttachmentPacketColdWraps.inviteToken, inviteToken),
				eq(envelopeAttachmentPacketColdWraps.email, row.email),
			),
		);

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
		entitledPackets,
	};
}

export async function filesColdInviteClaim(args: {
	userWallet: Address;
	inviteToken: string;
	body: unknown;
}) {
	const parsedBody = zColdInviteClaimBody.safeParse(args.body);
	if (parsedBody.error) {
		throwZodBadRequest(parsedBody.error);
	}
	const inviteToken = args.inviteToken;
	if (!inviteToken || inviteToken.length < 8) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "Invalid invite token",
					path: ["inviteToken"],
				},
			]),
		);
	}

	const userWallet = getAddress(args.userWallet);

	const profileEmail = await primaryEmailForWallet(userWallet);
	if (!profileEmail) {
		throwAppError("SIGNING.EMAIL_REQUIRED");
	}

	const [invite] = await db
		.select({
			id: fileColdInvites.id,
			filePieceCid: fileColdInvites.filePieceCid,
			email: fileColdInvites.email,
			emailCommitment: fileColdInvites.emailCommitment,
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
		throwAppError("FILES.INVITE_NOT_FOUND");
	}

	if (invite.isSigner && !invite.emailCommitment) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Cold signer invite missing email commitment",
		});
	}
	const signerEmailCommitment = invite.isSigner ? invite.emailCommitment : null;

	const now = new Date();
	await db.transaction(async (tx) => {
		await tx
			.insert(fileParticipants)
			.values({
				filePieceCid: invite.filePieceCid,
				wallet: userWallet,
				role: invite.isSigner ? "signer" : "viewer",
				emailCommitment: signerEmailCommitment,
				kemCiphertext: parsedBody.data.kemCiphertext,
				encryptedEncryptionKey: parsedBody.data.encryptedEncryptionKey,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: [fileParticipants.filePieceCid, fileParticipants.wallet],
				set: {
					role: invite.isSigner ? "signer" : "viewer",
					emailCommitment: signerEmailCommitment,
					kemCiphertext: parsedBody.data.kemCiphertext,
					encryptedEncryptionKey: parsedBody.data.encryptedEncryptionKey,
					updatedAt: now,
				},
			});

		await tx
			.update(fileColdInvites)
			.set(redactColdInviteRow(userWallet))
			.where(eq(fileColdInvites.id, invite.id));
	});

	trackServerEvent({
		distinctId: userWallet,
		event: SERVER_ANALYTICS_EVENTS.coldInviteClaimed,
		pieceCid: invite.filePieceCid,
		properties: { is_signer: invite.isSigner },
	});

	return {
		filePieceCid: invite.filePieceCid,
		role: invite.isSigner ? ("signer" as const) : ("viewer" as const),
	};
}

export async function filesColdInviteRegenerate(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
}) {
	const parsedBody = zColdInviteRegenerateBody.safeParse(args.body);
	if (parsedBody.error) {
		throwZodBadRequest(parsedBody.error);
	}
	const pieceCid = args.pieceCid.trim();
	const senderWallet = getAddress(args.userWallet);

	if (!pieceCid || pieceCid.length < 8) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "Invalid pieceCid",
					path: ["pieceCid"],
				},
			]),
		);
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
		throwAppError("FILES.FORBIDDEN");
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
		throwAppError("FILES.INVITE_NOT_FOUND");
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
