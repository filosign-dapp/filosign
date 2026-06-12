import { throwAppError } from "@filosign/errors/server";
import { eq } from "drizzle-orm";
import env from "@/env";
import db from "@/lib/platform/db";
import { logFocSmoke } from "@/lib/domains/foc/smoke-log";
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

/** R2 presign when present (primary); FOC CDN when R2 missing or `TEST_FOC` smoke. */
export async function resolveCiphertextDownloadUrl(
	pieceCid: string,
): Promise<string> {
	const r2Key = uploadsKey(pieceCid);
	const focRow = await loadFocRow(pieceCid);
	const focReady = focRow != null && isFocRetrievable(focRow);

	if (env.TEST_FOC && focReady) {
		const url = archivalCdnUrl(pieceCid);
		logFocSmoke("download via FOC CDN (TEST_FOC prefer)", { pieceCid, url });
		return url;
	}

	if (await bucket.exists(r2Key)) {
		const url = bucket.presign(r2Key, {
			method: "GET",
			expiresIn: PRESIGN_EXPIRES_SEC,
		});
		logFocSmoke("download via R2 presign", {
			pieceCid,
			focReady,
			testFoc: env.TEST_FOC,
		});
		return url;
	}

	if (focReady) {
		const url = archivalCdnUrl(pieceCid);
		logFocSmoke("download via FOC CDN (R2 missing fallback)", {
			pieceCid,
			url,
		});
		return url;
	}

	throwAppError("FILES.NOT_FOUND");
}
