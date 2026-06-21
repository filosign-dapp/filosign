import type { SystemTemplateMeta, TemplateSnapshot } from "@filosign/shared";
import * as t from "drizzle-orm/pg-core";
import { tEvmAddress, tHex, timestamps } from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { users } from "./user";

export const systemTemplateStatuses = [
	"draft",
	"published",
	"archived",
] as const;
export type SystemTemplateStatus = (typeof systemTemplateStatuses)[number];

export const systemTemplates = t.pgTable(
	"system_templates",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		name: t.text().notNull(),
		status: t.text({ enum: systemTemplateStatuses }).notNull().default("draft"),
		snapshotJson: t.jsonb().$type<TemplateSnapshot>().notNull(),
		metaJson: t.jsonb().$type<SystemTemplateMeta>().notNull(),
		contentFingerprint: tHex().notNull(),
		createdByWallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		publishedAt: t.timestamp({ withTimezone: true }),
		archivedAt: t.timestamp({ withTimezone: true }),
		...timestamps,
	},
	(table) => [
		t
			.index("idx_system_templates_status_published")
			.on(table.status, table.publishedAt),
	],
);

export const systemTemplateDocuments = t.pgTable(
	"system_template_documents",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		systemTemplateId: t
			.uuid()
			.notNull()
			.references(() => systemTemplates.id, { onDelete: "cascade" }),
		docId: t.text().notNull(),
		s3Key: t.text().notNull(),
		name: t.text().notNull(),
		size: t.integer().notNull(),
		mimeType: t.text().notNull(),
		plaintextSha256: tHex().notNull(),
		...timestamps,
	},
	(table) => [
		t
			.uniqueIndex("uidx_system_template_documents_template_doc")
			.on(table.systemTemplateId, table.docId),
		t
			.index("idx_system_template_documents_template")
			.on(table.systemTemplateId),
	],
);
