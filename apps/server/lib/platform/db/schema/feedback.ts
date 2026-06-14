import {
	FEEDBACK_FEATURE_AREAS,
	FEEDBACK_PROMPT_TYPES,
} from "@filosign/shared";
import * as t from "drizzle-orm/pg-core";
import { tEvmAddress, timestamps } from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { organizations } from "./organization";
import { users } from "./user";

export const productFeedback = t.pgTable(
	"product_feedback",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		walletAddress: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress, { onDelete: "cascade" }),
		organizationId: t
			.uuid()
			.references(() => organizations.id, { onDelete: "set null" }),
		featureArea: t.text({ enum: FEEDBACK_FEATURE_AREAS }).notNull(),
		route: t.text(),
		rating: t.integer(),
		message: t.text(),
		pieceCid: t.text(),
		promptType: t
			.text({ enum: FEEDBACK_PROMPT_TYPES })
			.notNull()
			.default("global"),
		trigger: t.text(),
		metadata: t.jsonb().$type<Record<string, unknown>>().notNull().default({}),
		...timestamps,
	},
	(table) => [
		t.index("idx_product_feedback_wallet").on(table.walletAddress),
		t.index("idx_product_feedback_created_at").on(table.createdAt),
	],
);
