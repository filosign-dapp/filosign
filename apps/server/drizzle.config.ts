import "@/lib/platform/polyfills/bigint-json";
import { defineConfig } from "drizzle-kit";
import env from "@/env";

export default defineConfig({
	out: "./drizzle",
	schema: "./lib/platform/db/schema",
	dialect: "postgresql",
	dbCredentials: {
		url: env.PG_URI.replace(":dbname", env.DB_NAME),
	},
	casing: "snake_case",
});
