import { throwAppError } from "@filosign/errors/server";
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
		throw throwAppError("FILES.NOT_FOUND");
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
		throw throwAppError("FILES.FORBIDDEN");
	}

	return { organizationId: fileRecord.organizationId };
}
