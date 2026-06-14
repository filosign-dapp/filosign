import { defineConfig } from "drizzle-kit";

const url = process.env.DRIZZLE_DATABASE_URL?.trim();
if (!url) {
	throw new Error("DRIZZLE_DATABASE_URL is required for drizzle-kit migrate");
}

export default defineConfig({
	out: "./drizzle",
	schema: "./lib/platform/db/schema",
	dialect: "postgresql",
	dbCredentials: { url },
	casing: "snake_case",
});
