import * as t from "drizzle-orm/pg-core";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";

export const jobOutboxKinds = [
	"doc_received",
	"cold_doc_invite",
	"envelope_completed",
	"signer_turn",
] as const;
export type JobOutboxKind = (typeof jobOutboxKinds)[number];

export type JobOutboxPayload = Record<string, unknown>;

export const jobOutbox = t.pgTable(
	"job_outbox",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		kind: t.text({ enum: jobOutboxKinds }).notNull(),
		payload: t.jsonb().$type<JobOutboxPayload>().notNull(),
		idempotencyKey: t.text("idempotency_key").notNull().unique(),
		createdAt: t
			.timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		processedAt: t.timestamp("processed_at", { withTimezone: true }),
		lastError: t.text("last_error"),
	},
	(table) => [
		t
			.index("idx_job_outbox_unprocessed")
			.on(table.processedAt, table.createdAt),
		t.index("idx_job_outbox_processed_at").on(table.processedAt),
	],
);
