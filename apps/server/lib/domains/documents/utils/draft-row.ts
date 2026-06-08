import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { zDocumentDraftRowSchema } from "@/api/orpc/schemas/documents-output";
import db from "@/lib/platform/db";

const { envelopeDraftDocuments, envelopeDrafts } = db.schema;

export type DocumentDraftRow = z.infer<typeof zDocumentDraftRowSchema>;

export function draftDocumentSizeBytesSelect() {
	return {
		sizeBytes: sql<number>`COALESCE((
			SELECT SUM(${envelopeDraftDocuments.size})::int
			FROM ${envelopeDraftDocuments}
			WHERE ${envelopeDraftDocuments.draftId} = ${envelopeDrafts.id}
		), 0)`,
	};
}

export function mapDraftListRow(row: {
	id: string;
	title: string;
	updatedAt: Date;
	createdByWallet: DocumentDraftRow["createdByWallet"];
	sizeBytes: number;
}): DocumentDraftRow {
	const totalBytes = row.sizeBytes;
	return {
		kind: "draft",
		id: row.id,
		title: row.title,
		updatedAt: row.updatedAt,
		createdByWallet: row.createdByWallet,
		sizeBytes: totalBytes > 0 ? totalBytes : null,
	};
}
