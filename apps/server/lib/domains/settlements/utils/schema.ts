import db from "@/lib/platform/db";

/** Call-time schema access so Bun `mock.module("@/lib/platform/db")` stays effective. */
export function settlementSchema() {
	return db.schema;
}
