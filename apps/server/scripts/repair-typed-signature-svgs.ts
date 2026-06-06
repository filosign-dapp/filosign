/**
 * Rewrites legacy typed signature SVGs in R2 using typed_meta (font catalog + valid XML).
 * New typed saves are PNG via client rasterizeTypedSignature.
 * Run: bun apps/server/scripts/repair-typed-signature-svgs.ts
 */

import {
	contentSha256Hex,
	extensionForContentType,
	renderTypedSignatureSvg,
} from "@filosign/shared";
import { eq, isNull } from "drizzle-orm";
import { userSignatureObjectKey } from "@/lib/domains/files/utils/signature-storage";
import db from "@/lib/platform/db";
import { bucket } from "@/lib/platform/s3/client";

const { userSignatures } = db.schema;

async function main() {
	const rows = await db
		.select()
		.from(userSignatures)
		.where(isNull(userSignatures.deletedAt));

	let repaired = 0;
	let skipped = 0;

	for (const row of rows) {
		if (row.kind !== "typed" || !row.typedMeta) {
			skipped += 1;
			continue;
		}

		const isInitial = row.role === "initial";
		const svg = renderTypedSignatureSvg({
			text: row.typedMeta.text,
			fontId: row.typedMeta.fontId,
			width: isInitial ? 200 : 520,
			height: isInitial ? 80 : 140,
		});
		const bytes = new TextEncoder().encode(svg);
		const nextSha = await contentSha256Hex(bytes);
		if (nextSha === row.contentSha256) {
			skipped += 1;
			continue;
		}

		const ext = extensionForContentType(row.contentType);
		const nextKey = userSignatureObjectKey(row.walletAddress, nextSha, ext);

		if (!(await bucket.exists(nextKey))) {
			await bucket.write(nextKey, bytes, { type: row.contentType });
		}

		await db
			.update(userSignatures)
			.set({
				storageKey: nextKey,
				contentSha256: nextSha,
				updatedAt: new Date(),
			})
			.where(eq(userSignatures.id, row.id));

		if (row.storageKey !== nextKey && (await bucket.exists(row.storageKey))) {
			await bucket.delete(row.storageKey);
		}

		console.log(
			`repaired ${row.id} ${row.role} ${row.storageKey} -> ${nextKey}`,
		);
		repaired += 1;
	}

	console.log(`done: repaired=${repaired} skipped=${skipped}`);
}

await main();
