import type { ActivationMilestoneId } from "@filosign/shared";
import * as t from "drizzle-orm/pg-core";
import { tEvmAddress, timestamps } from "@/lib/platform/db/helpers";
import { files } from "./file";
import { users } from "./user";

export const userActivationMilestones = t.pgTable(
	"user_activation_milestones",
	{
		walletAddress: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress, { onDelete: "cascade" }),
		milestone: t.text().notNull().$type<ActivationMilestoneId>(),
		completedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		t.primaryKey({ columns: [table.walletAddress, table.milestone] }),
		t.index("idx_user_activation_milestones_wallet").on(table.walletAddress),
	],
);

export const userActivationState = t.pgTable("user_activation_state", {
	walletAddress: tEvmAddress()
		.primaryKey()
		.references(() => users.walletAddress, { onDelete: "cascade" }),
	practicePieceCid: t
		.text()
		.references(() => files.pieceCid, { onDelete: "set null" }),
	...timestamps,
});
