import { throwAppError } from "@filosign/errors/server";
import { eq } from "drizzle-orm";
import { isFocRetrievalEnabled } from "@/lib/domains/foc/enabled";
import db from "@/lib/platform/db";
import { archivalCdnUrl } from "@/lib/platform/foc";
import { bucket } from "@/lib/platform/s3/client";

const { focObjects } = db.schema;

const uploadsKey = (pieceCid: string) => `uploads/${pieceCid}`;

const PRESIGN_EXPIRES_SEC = 60 * 5;

type FocRow = {
	replicateStatus: "pending" | "replicated";
	focVerifiedAt: Date | null;
};

function isFocRetrievable(row: FocRow): boolean {
	return row.replicateStatus === "replicated" && row.focVerifiedAt != null;
}

async function loadFocRow(pieceCid: string): Promise<FocRow | null> {
	const [row] = await db
		.select({
			replicateStatus: focObjects.replicateStatus,
			focVerifiedAt: focObjects.focVerifiedAt,
		})
		.from(focObjects)
		.where(eq(focObjects.pieceCid, pieceCid))
		.limit(1);

	return row ?? null;
}

/** R2 presign by default; FOC FilBeam URL when `FOC_RETRIEVAL` and object is replicated. */
export async function resolveCiphertextDownloadUrl(
	pieceCid: string,
): Promise<string> {
	if (isFocRetrievalEnabled()) {
		const focRow = await loadFocRow(pieceCid);
		if (focRow != null && isFocRetrievable(focRow)) {
			return archivalCdnUrl(pieceCid);
		}
	}

	const r2Key = uploadsKey(pieceCid);
	if (await bucket.exists(r2Key)) {
		return bucket.presign(r2Key, {
			method: "GET",
			expiresIn: PRESIGN_EXPIRES_SEC,
		});
	}

	throwAppError("FILES.NOT_FOUND");
}
