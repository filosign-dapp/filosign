import * as t from "drizzle-orm/pg-core";
import { tEvmAddress } from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { organizations } from "./organization";
import { users } from "./user";

export const auditEvents = t.pgTable(
	"audit_events",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		actorWallet: tEvmAddress().references(() => users.walletAddress),
		organizationId: t
			.uuid()
			.references(() => organizations.id, { onDelete: "set null" }),
		action: t.text().notNull(),
		resourceType: t.text().notNull(),
		resourceId: t.text().notNull(),
		metadataJson: t.jsonb(),
		createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		t
			.index("idx_audit_events_actor_created")
			.on(table.actorWallet, table.createdAt),
		t
			.index("idx_audit_events_org_created")
			.on(table.organizationId, table.createdAt),
		t
			.index("idx_audit_events_action_created")
			.on(table.action, table.createdAt),
	],
);
