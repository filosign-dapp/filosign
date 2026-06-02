import { eq, inArray } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import { buildEmailIdempotencyKey } from "@/lib/platform/email/idempotency";
import type { JobOutboxInsert } from "@/lib/platform/jobs";

const { users } = db.schema;

export async function buildRegisterEmailOutboxRows(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	args: {
		sender: Address;
		pieceCid: string;
		participantWallets: Address[];
		coldInvites: { email: string; inviteToken: string }[];
	},
): Promise<JobOutboxInsert[]> {
	const senderNorm = getAddress(args.sender);
	const walletList = [
		...new Set(args.participantWallets.map((w) => getAddress(w))),
	];

	const participantProfiles =
		walletList.length > 0
			? await tx
					.select({
						walletAddress: users.walletAddress,
						email: users.email,
					})
					.from(users)
					.where(inArray(users.walletAddress, walletList))
			: [];

	const [senderProfile] = await tx
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

	const rows: JobOutboxInsert[] = [];

	for (const profile of participantProfiles) {
		if (!profile.email?.trim()) continue;
		const to = profile.email.trim().toLowerCase();
		const idempotencySegments = [
			"doc-received",
			to,
			args.pieceCid,
			senderNorm.toLowerCase(),
		];
		rows.push({
			kind: "doc_received",
			payload: {
				to,
				senderWallet: senderNorm,
				pieceCid: args.pieceCid,
				senderName,
			},
			idempotencyKey: buildEmailIdempotencyKey(idempotencySegments),
		});
	}

	for (const invite of args.coldInvites) {
		const to = invite.email.trim().toLowerCase();
		const idempotencySegments = [
			"cold-doc-invite",
			to,
			args.pieceCid,
			senderNorm.toLowerCase(),
			invite.inviteToken,
		];
		rows.push({
			kind: "cold_doc_invite",
			payload: {
				to,
				senderWallet: senderNorm,
				pieceCid: args.pieceCid,
				inviteToken: invite.inviteToken,
				senderName,
			},
			idempotencyKey: buildEmailIdempotencyKey(idempotencySegments),
		});
	}

	return rows;
}
