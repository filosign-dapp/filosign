import { eq } from "drizzle-orm";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import { waitingForMoreSigners } from "./envelope-waiting";
import { readEnvelopeRegistryProgress } from "./piece-helpers";

export { waitingForMoreSigners } from "./envelope-waiting";

const { files } = db.schema;

export async function readPieceEnvelopeProgress(pieceCid: string) {
	const [file] = await db
		.select({
			registryAddress: files.registryAddress,
			registerRoutingJson: files.registerRoutingJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);

	if (!file) {
		return null;
	}

	return readEnvelopeRegistryProgress({
		pieceCid,
		registryAddress: getAddress(file.registryAddress),
		registerRouting: file.registerRoutingJson ?? undefined,
	});
}

export async function isPieceWaitingForMoreSigners(
	pieceCid: string,
): Promise<boolean> {
	const progress = await readPieceEnvelopeProgress(pieceCid);
	return waitingForMoreSigners(progress);
}
