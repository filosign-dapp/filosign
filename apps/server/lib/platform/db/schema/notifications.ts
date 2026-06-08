import * as t from "drizzle-orm/pg-core";
import { tEvmAddress, timestamps } from "@/lib/platform/db/helpers";
import { users } from "./user";

export const notificationDismissalTypes = ["envelope_received"] as const;
export type NotificationDismissalType =
	(typeof notificationDismissalTypes)[number];

export const notificationDismissals = t.pgTable(
	"notification_dismissals",
	{
		wallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress, { onDelete: "cascade" }),
		type: t.text({ enum: notificationDismissalTypes }).notNull(),
		entityId: t.text().notNull(),
		dismissedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
		...timestamps,
	},
	(table) => [
		t
			.uniqueIndex("uidx_notification_dismissals_wallet_type_entity")
			.on(table.wallet, table.type, table.entityId),
		t.index("idx_notification_dismissals_wallet").on(table.wallet),
	],
);
