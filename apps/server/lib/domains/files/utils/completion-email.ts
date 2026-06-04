import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import { buildEmailIdempotencyKey } from "@/lib/platform/email";
import type { JobOutboxInsert } from "@/lib/platform/jobs";

const { files, fileParticipants, users } = db.schema;

export async function buildEnvelopeCompletedEmailOutboxRows(args: {
	pieceCid: string;
	sender: Address;
}): Promise<JobOutboxInsert[]> {
	const senderNorm = getAddress(args.sender);

	const [fileRow] = await db
		.select({ displayName: files.displayName })
		.from(files)
		.where(eq(files.pieceCid, args.pieceCid))
		.limit(1);

	const envelopeName = fileRow?.displayName?.trim() || "your document";

	const participantRows = await db
		.select({
			wallet: fileParticipants.wallet,
			email: users.email,
		})
		.from(fileParticipants)
		.innerJoin(users, eq(fileParticipants.wallet, users.walletAddress))
		.where(eq(fileParticipants.filePieceCid, args.pieceCid));

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

	const emails = new Map<string, string>();
	for (const row of participantRows) {
		const email = row.email?.trim().toLowerCase();
		if (!email) continue;
		emails.set(email, getAddress(row.wallet).toLowerCase());
	}
	if (senderProfile?.email?.trim()) {
		emails.set(
			senderProfile.email.trim().toLowerCase(),
			senderNorm.toLowerCase(),
		);
	}

	const rows: JobOutboxInsert[] = [];
	for (const to of emails.keys()) {
		rows.push({
			kind: "envelope_completed",
			payload: {
				to,
				senderWallet: senderNorm,
				pieceCid: args.pieceCid,
				senderName,
				envelopeName,
			},
			idempotencyKey: buildEmailIdempotencyKey([
				"envelope-completed",
				to,
				args.pieceCid,
			]),
		});
	}
	return rows;
}
