import { and, eq } from "drizzle-orm";
import db from "@/lib/platform/db";

const { fileParticipants, fileSignatures } = db.schema;

/** True when every signer role participant has a file_signatures row. */
export async function isEnvelopeFullySigned(
	pieceCid: string,
): Promise<boolean> {
	const signers = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(
			and(
				eq(fileParticipants.filePieceCid, pieceCid),
				eq(fileParticipants.role, "signer"),
			),
		);

	if (signers.length === 0) return false;

	const signatures = await db
		.select({ signer: fileSignatures.signer })
		.from(fileSignatures)
		.where(eq(fileSignatures.filePieceCid, pieceCid));

	const signedWallets = new Set(signatures.map((s) => s.signer.toLowerCase()));

	return signers.every((s) => signedWallets.has(s.wallet.toLowerCase()));
}
