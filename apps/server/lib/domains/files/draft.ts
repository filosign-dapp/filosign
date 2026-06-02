import { zPlacementManifest } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import z from "zod";
import db from "@/lib/platform/db";
import { zodSafeParseMessage } from "@/lib/platform/utils/zodHttp";
import { primaryEmailForWallet } from "./invites";
import { requireAckForParticipantAccess } from "./utils/piece-helpers";

const { files, fileParticipants, fileSignerDrafts } = db.schema;

const zSignDraftPutBody = z.object({
	completedFieldIds: z.array(z.string()),
});

export async function pieceSignDraftGet(userWallet: Address, pieceCid: string) {
	const [fileRecord] = await db
		.select({
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	const [participantRecord] = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(
			and(
				eq(fileParticipants.filePieceCid, pieceCid),
				eq(fileParticipants.role, "signer"),
				eq(fileParticipants.wallet, userWallet),
			),
		);

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}
	if (!participantRecord) {
		throw new ORPCError("FORBIDDEN", {
			message: "You are not required to sign this file",
		});
	}

	await requireAckForParticipantAccess(userWallet, pieceCid);

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "File placement manifest missing or invalid",
		});
	}

	const signerEmail = await primaryEmailForWallet(participantRecord.wallet);
	if (!signerEmail) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Add a primary email to your Filosign profile to use placement drafts",
		});
	}
	const allowedIds = new Set(
		manifestParsed.data.fields
			.filter((f) => f.assignedRecipientEmail === signerEmail)
			.map((f) => f.id),
	);

	const [draft] = await db
		.select({ completedFieldIds: fileSignerDrafts.completedFieldIds })
		.from(fileSignerDrafts)
		.where(
			and(
				eq(fileSignerDrafts.filePieceCid, pieceCid),
				eq(fileSignerDrafts.wallet, participantRecord.wallet),
			),
		);

	const stored = draft?.completedFieldIds ?? [];
	const completedFieldIds = stored.filter((id) => allowedIds.has(id));

	return { completedFieldIds };
}

export async function pieceSignDraftPut(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
}) {
	const parsedBody = zSignDraftPutBody.safeParse(args.body);
	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", {
			message: zodSafeParseMessage(parsedBody.error),
		});
	}
	const { completedFieldIds: bodyIds } = parsedBody.data;
	const pieceCid = args.pieceCid;
	const userWallet = args.userWallet;

	await requireAckForParticipantAccess(userWallet, pieceCid);

	const [fileRecord] = await db
		.select({
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	const [participantRecord] = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(
			and(
				eq(fileParticipants.filePieceCid, pieceCid),
				eq(fileParticipants.role, "signer"),
				eq(fileParticipants.wallet, userWallet),
			),
		);

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}
	if (!participantRecord) {
		throw new ORPCError("FORBIDDEN", {
			message: "You are not required to sign this file",
		});
	}

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "File placement manifest missing or invalid",
		});
	}

	const signerEmail = await primaryEmailForWallet(participantRecord.wallet);
	if (!signerEmail) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Add a primary email to your Filosign profile to use placement drafts",
		});
	}
	const allowedIds = new Set(
		manifestParsed.data.fields
			.filter((f) => f.assignedRecipientEmail === signerEmail)
			.map((f) => f.id),
	);

	for (const id of bodyIds) {
		if (!allowedIds.has(id)) {
			throw new ORPCError("BAD_REQUEST", {
				message: "completedFieldIds must match manifest fields for signer",
			});
		}
	}

	const completedFieldIds = [...new Set(bodyIds)];
	const now = new Date();

	await db
		.insert(fileSignerDrafts)
		.values({
			filePieceCid: pieceCid,
			wallet: participantRecord.wallet,
			completedFieldIds,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: [fileSignerDrafts.filePieceCid, fileSignerDrafts.wallet],
			set: {
				completedFieldIds,
				updatedAt: now,
			},
		});

	return { completedFieldIds };
}
