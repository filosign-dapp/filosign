import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { getOrgMemberWithDocumentRead } from "@/lib/domains/orgs";
import db from "@/lib/platform/db";

const { fileParticipants, files } = db.schema;

/** Participant, sender, or org member with document read. */
export async function assertPieceReadAccess(
	userWallet: Address,
	pieceCid: string,
): Promise<{ organizationId: string }> {
	const [fileRecord] = await db
		.select({
			organizationId: files.organizationId,
			sender: files.sender,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}

	const userWalletNorm = getAddress(userWallet);
	const participants = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(eq(fileParticipants.filePieceCid, pieceCid));

	const isParticipant = participants.some(
		(p) => getAddress(p.wallet) === userWalletNorm,
	);
	const isSender = getAddress(fileRecord.sender) === userWalletNorm;
	const orgRead =
		!isParticipant &&
		!isSender &&
		(await getOrgMemberWithDocumentRead(
			userWalletNorm,
			fileRecord.organizationId,
		));

	if (!isParticipant && !isSender && !orgRead) {
		throw new ORPCError("FORBIDDEN", {
			message: "You dont have access to this file",
		});
	}

	return { organizationId: fileRecord.organizationId };
}
