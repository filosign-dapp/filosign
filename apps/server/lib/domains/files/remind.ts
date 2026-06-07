import { throwAppError } from "@filosign/errors/server";
import { and, eq, inArray } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import db from "@/lib/platform/db";
import { buildEmailIdempotencyKey } from "@/lib/platform/email";
import type { JobOutboxInsert } from "@/lib/platform/jobs";
import { enqueueOutboxByIds, insertJobOutboxRows } from "@/lib/platform/jobs";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

const {
	files,
	fileParticipants,
	fileColdInvites,
	fileSignatures,
	users,
	jobOutbox,
} = db.schema;

export const zRemindSignersBody = z.object({
	pieceCid: z.string().min(1),
});

function utcDayBucket(now = new Date()): string {
	return now.toISOString().slice(0, 10);
}

export async function filesRemindSigners(
	sender: Address,
	rawBody: unknown,
): Promise<{ remindedCount: number; skippedCount: number }> {
	const parsed = zRemindSignersBody.safeParse(rawBody);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	const senderNorm = getAddress(sender);
	const { pieceCid } = parsed.data;

	const [file] = await db
		.select({
			sender: files.sender,
			completedAt: files.completedAt,
			revokedBeforeCompletedAt: files.revokedBeforeCompletedAt,
			isPractice: files.isPractice,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);

	if (!file) {
		throwAppError("FILES.NOT_FOUND");
	}
	if (getAddress(file.sender) !== senderNorm) {
		throwAppError("FILES.FORBIDDEN");
	}
	if (file.revokedBeforeCompletedAt) {
		throwAppError("FILES.ENVELOPE_VOIDED");
	}
	if (file.completedAt) {
		throwAppError("FILES.ENVELOPE_COMPLETE");
	}
	if (file.isPractice) {
		throwAppError("FILES.FORBIDDEN");
	}

	const signedWallets = new Set(
		(
			await db
				.select({ signer: fileSignatures.signer })
				.from(fileSignatures)
				.where(eq(fileSignatures.filePieceCid, pieceCid))
		).map((row) => getAddress(row.signer).toLowerCase()),
	);

	const warmSigners = await db
		.select({
			wallet: fileParticipants.wallet,
			email: users.email,
			firstName: users.firstName,
			lastName: users.lastName,
			username: users.username,
		})
		.from(fileParticipants)
		.innerJoin(users, eq(fileParticipants.wallet, users.walletAddress))
		.where(
			and(
				eq(fileParticipants.filePieceCid, pieceCid),
				eq(fileParticipants.role, "signer"),
			),
		);

	const coldSigners = await db
		.select({
			email: fileColdInvites.email,
			inviteToken: fileColdInvites.inviteToken,
		})
		.from(fileColdInvites)
		.where(
			and(
				eq(fileColdInvites.filePieceCid, pieceCid),
				eq(fileColdInvites.isSigner, true),
				eq(fileColdInvites.status, "pending"),
			),
		);

	const [senderProfile] = await db
		.select({
			email: users.email,
			firstName: users.firstName,
			lastName: users.lastName,
			username: users.username,
		})
		.from(users)
		.where(eq(users.walletAddress, senderNorm))
		.limit(1);

	const senderName =
		[senderProfile?.firstName, senderProfile?.lastName]
			.filter(Boolean)
			.join(" ") ||
		senderProfile?.username ||
		senderProfile?.email ||
		undefined;

	const day = utcDayBucket();
	const candidateRows: JobOutboxInsert[] = [];

	for (const signer of warmSigners) {
		const wallet = getAddress(signer.wallet);
		if (signedWallets.has(wallet.toLowerCase())) continue;
		const email = signer.email?.trim().toLowerCase();
		if (!email) continue;

		candidateRows.push({
			kind: "doc_received",
			payload: {
				to: email,
				senderWallet: senderNorm,
				pieceCid,
				senderName,
				intent: "reminder",
			},
			idempotencyKey: buildEmailIdempotencyKey([
				"sign-reminder",
				day,
				email,
				pieceCid,
				senderNorm.toLowerCase(),
			]),
		});
	}

	for (const invite of coldSigners) {
		const email = invite.email.trim().toLowerCase();
		const token = invite.inviteToken?.trim();
		if (!token) continue;

		candidateRows.push({
			kind: "cold_doc_invite",
			payload: {
				to: email,
				senderWallet: senderNorm,
				pieceCid,
				inviteToken: token,
				senderName,
				intent: "reminder",
			},
			idempotencyKey: buildEmailIdempotencyKey([
				"sign-reminder",
				day,
				email,
				pieceCid,
				senderNorm.toLowerCase(),
				token,
			]),
		});
	}

	if (candidateRows.length === 0) {
		return { remindedCount: 0, skippedCount: 0 };
	}

	const keys = candidateRows.map((row) => row.idempotencyKey);
	const existing = await db
		.select({ idempotencyKey: jobOutbox.idempotencyKey })
		.from(jobOutbox)
		.where(inArray(jobOutbox.idempotencyKey, keys));
	const existingKeys = new Set(existing.map((row) => row.idempotencyKey));

	const toInsert = candidateRows.filter(
		(row) => !existingKeys.has(row.idempotencyKey),
	);
	const skippedCount = candidateRows.length - toInsert.length;

	if (toInsert.length === 0) {
		return { remindedCount: 0, skippedCount };
	}

	const inserted = await db.transaction(async (tx) =>
		insertJobOutboxRows(tx, toInsert),
	);
	if (inserted.length > 0) {
		await enqueueOutboxByIds(inserted.map((row) => row.id));
	}

	return { remindedCount: inserted.length, skippedCount };
}
