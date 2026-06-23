import * as t from "drizzle-orm/pg-core";
import { timestamps } from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { files } from "./file";
import { organizations } from "./organization";

export const focObjectLifecycles = [
	"active",
	"pending_deletion",
	"deleted",
] as const;
export type FocObjectLifecycle = (typeof focObjectLifecycles)[number];

export const focReplicateStatuses = ["pending", "replicated"] as const;
export type FocReplicateStatus = (typeof focReplicateStatuses)[number];

export const focObjects = t.pgTable(
	"foc_objects",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		organizationId: t
			.uuid()
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		pieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		r2Key: t.text().notNull(),
		byteLength: t.integer().notNull().default(0),
		replicateStatus: t
			.text({ enum: focReplicateStatuses })
			.notNull()
			.default("pending"),
		dealId: t.text(),
		retentionUntil: t.timestamp({ withTimezone: true }).notNull(),
		completedAt: t.timestamp({ withTimezone: true }).notNull(),
		r2EvictedAt: t.timestamp({ withTimezone: true }),
		focVerifiedAt: t.timestamp({ withTimezone: true }),
		lifecycle: t
			.text({ enum: focObjectLifecycles })
			.notNull()
			.default("active"),
		...timestamps,
	},
	(table) => [
		t
			.index("idx_foc_objects_org_lifecycle")
			.on(table.organizationId, table.lifecycle),
		t
			.index("idx_foc_objects_transition_due")
			.on(table.replicateStatus, table.r2EvictedAt),
		t.uniqueIndex("idx_foc_objects_piece_cid").on(table.pieceCid),
	],
);
