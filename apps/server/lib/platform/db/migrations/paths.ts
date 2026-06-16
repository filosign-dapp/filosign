import path from "node:path";

/** `apps/server` root (parent of `lib/`). */
export const serverRoot = path.resolve(import.meta.dir, "../../../..");

export const drizzleDir = path.join(serverRoot, "drizzle");
export const metaDir = path.join(drizzleDir, "meta");
export const migrationsFolder = drizzleDir;
