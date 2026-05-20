import dbClient from "./client";
import { dbExtensionHelpers } from "./extensions";
import schema from "./schema";

const db = Object.assign(dbClient, dbExtensionHelpers(dbClient), { schema });

export default db;
