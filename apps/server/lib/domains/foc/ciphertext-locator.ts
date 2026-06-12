import { throwAppError } from "@filosign/errors/server";
import { eq } from "drizzle-orm";
import { isFocEnabled } from "@/lib/domains/foc/enabled";
import { logFocSmoke } from "@/lib/domains/foc/smoke-log";
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

/** R2-only when FOC disabled; when enabled, prefer FOC CDN if replicated else R2. */
export async function resolveCiphertextDownloadUrl(
	pieceCid: string,
): Promise<string> {
	const r2Key = uploadsKey(pieceCid);
	const focEnabled = isFocEnabled();

	if (focEnabled) {
		const focRow = await loadFocRow(pieceCid);
		const focReady = focRow != null && isFocRetrievable(focRow);
		if (focReady) {
			const url = archivalCdnUrl(pieceCid);
			logFocSmoke("download via FOC CDN (FOC enabled)", { pieceCid, url });
			return url;
		}
	}

	if (await bucket.exists(r2Key)) {
		const url = bucket.presign(r2Key, {
			method: "GET",
			expiresIn: PRESIGN_EXPIRES_SEC,
		});
		logFocSmoke("download via R2 presign", {
			pieceCid,
			focEnabled,
		});
		return url;
	}

	throwAppError("FILES.NOT_FOUND");
}
