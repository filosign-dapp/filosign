import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import env from "@/env";
import schema from "./schema";

const pool = new Pool({
	connectionString: env.PG_URI.replace(":dbname", env.DB_NAME),
});

const dbClient = drizzle({ client: pool, schema, casing: "snake_case" });

export default dbClient;
