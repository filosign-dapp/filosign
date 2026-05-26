import { eq } from "drizzle-orm";
import db from "@/lib/platform/db";
import { bucket } from "@/lib/platform/s3/client";
import { getOrCreateServerDataset } from "./synapse";

const { fileArchival } = db.schema;

export async function copyPieceFromR2ToFoc(pieceCid: string): Promise<void> {
	const key = `uploads/${pieceCid}`;
	if (!(await bucket.exists(key))) {
		throw new Error(`Ciphertext missing on R2: ${key}`);
	}

	const file = bucket.file(key);
	const bytes = new Uint8Array(await file.arrayBuffer());
	if (bytes.byteLength === 0) {
		throw new Error("Ciphertext on R2 is empty");
	}

	const dataset = await getOrCreateServerDataset();
	const uploadResult = await dataset.upload(bytes, { pieceMetadata: {} });

	if (uploadResult.pieceCid.toString() !== pieceCid) {
		throw new Error(
			`FOC piece CID mismatch: expected ${pieceCid}, got ${uploadResult.pieceCid}`,
		);
	}

	await db
		.update(fileArchival)
		.set({
			status: "archived",
			archivedAt: new Date(),
			failureReason: null,
			updatedAt: new Date(),
		})
		.where(eq(fileArchival.pieceCid, pieceCid));
}

export async function markArchivalFailed(
	pieceCid: string,
	reason: string,
): Promise<void> {
	await db
		.update(fileArchival)
		.set({
			status: "failed",
			failureReason: reason.slice(0, 2000),
			updatedAt: new Date(),
		})
		.where(eq(fileArchival.pieceCid, pieceCid));
}
