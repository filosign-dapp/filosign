import type { RegisterRoutingInput } from "@filosign/shared";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { pendingFileColdInviteFilter } from "@/lib/domains/invites";
import db from "@/lib/platform/db";
import { buildEmailIdempotencyKey } from "@/lib/platform/email";
import type { JobOutboxInsert } from "@/lib/platform/jobs";
import type { RegisterPersistTx } from "./register-helpers";

type QueryClient = typeof db | RegisterPersistTx;

function schema() {
	return db.schema;
}

async function signerAlreadySigned(args: {
	query: QueryClient;
	pieceCid: string;
	wallet: Address;
}): Promise<boolean> {
	const { fileSignatures } = schema();
	const walletNorm = getAddress(args.wallet);
	const [row] = await args.query
		.select({ signer: fileSignatures.signer })
		.from(fileSignatures)
		.where(
			and(
				eq(fileSignatures.filePieceCid, args.pieceCid),
				eq(fileSignatures.signer, walletNorm),
			),
		)
		.limit(1);
	return row != null;
}

export async function buildSignerTurnEmailOutboxRows(args: {
	pieceCid: string;
	sender: Address;
	registerRoutingJson: RegisterRoutingInput | null;
	nextSignerEmail?: string | null;
	turnEpoch: number;
	tx?: RegisterPersistTx;
}): Promise<JobOutboxInsert[]> {
	const routing = args.registerRoutingJson;
	if (routing?.routingMode !== 1 || !routing.routingOrderEmails?.length) {
		return [];
	}

	const query = args.tx ?? db;
	const { files, fileParticipants, fileColdInvites, users } = schema();
	const senderNorm = getAddress(args.sender);

	const [file] = await query
		.select({
			displayName: files.displayName,
			completedAt: files.completedAt,
			revokedBeforeCompletedAt: files.revokedBeforeCompletedAt,
			isPractice: files.isPractice,
		})
		.from(files)
		.where(eq(files.pieceCid, args.pieceCid))
		.limit(1);

	if (
		!file ||
		file.completedAt != null ||
		file.revokedBeforeCompletedAt != null ||
		file.isPractice
	) {
		return [];
	}

	const nextEmail =
		args.nextSignerEmail?.trim().toLowerCase() ??
		routing.routingOrderEmails[0]?.trim().toLowerCase();
	if (!nextEmail) {
		return [];
	}

	const [senderProfile] = await query
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

	const documentTitle = file.displayName?.trim() || undefined;

	const warmSigners = await query
		.select({
			wallet: fileParticipants.wallet,
			email: users.email,
		})
		.from(fileParticipants)
		.innerJoin(users, eq(fileParticipants.wallet, users.walletAddress))
		.where(
			and(
				eq(fileParticipants.filePieceCid, args.pieceCid),
				eq(fileParticipants.role, "signer"),
			),
		);

	const warmMatch = warmSigners.find(
		(row) => row.email?.trim().toLowerCase() === nextEmail,
	);
	if (warmMatch) {
		const wallet = getAddress(warmMatch.wallet);
		if (await signerAlreadySigned({ query, pieceCid: args.pieceCid, wallet })) {
			return [];
		}

		return [
			{
				kind: "signer_turn",
				payload: {
					to: nextEmail,
					senderWallet: senderNorm,
					pieceCid: args.pieceCid,
					senderName,
					documentTitle,
					variant: "warm",
				},
				idempotencyKey: buildEmailIdempotencyKey([
					"signer-turn",
					args.pieceCid,
					nextEmail,
					String(args.turnEpoch),
				]),
			},
		];
	}

	const coldInvites = await query
		.select({
			email: fileColdInvites.email,
			inviteToken: fileColdInvites.inviteToken,
		})
		.from(fileColdInvites)
		.where(
			and(
				eq(fileColdInvites.filePieceCid, args.pieceCid),
				eq(fileColdInvites.isSigner, true),
				pendingFileColdInviteFilter(),
			),
		);

	const coldMatch = coldInvites.find(
		(row) => row.email.trim().toLowerCase() === nextEmail,
	);
	if (!coldMatch?.inviteToken?.trim()) {
		return [];
	}

	return [
		{
			kind: "signer_turn",
			payload: {
				to: nextEmail,
				senderWallet: senderNorm,
				pieceCid: args.pieceCid,
				senderName,
				documentTitle,
				variant: "cold",
				inviteToken: coldMatch.inviteToken.trim(),
			},
			idempotencyKey: buildEmailIdempotencyKey([
				"signer-turn",
				args.pieceCid,
				nextEmail,
				String(args.turnEpoch),
			]),
		},
	];
}
