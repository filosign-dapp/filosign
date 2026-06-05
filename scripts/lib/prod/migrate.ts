import path from "node:path";
import { runInherit } from "../spawn.ts";
import { createProdContext } from "./context.ts";
import { withPostgresTunnel } from "./tunnel.ts";

export async function migrateProd(root: string): Promise<number> {
	const ctx = createProdContext(root);
	const server = path.join(root, "apps/server");

	return withPostgresTunnel(ctx, async (localPort) => {
		return runInherit(root, [
			"infisical",
			"run",
			"--env=prod",
			"--path=/app",
			"--",
			"bun",
			"-e",
			`const u=new URL(process.env.PG_URI.replace(":dbname","/dbname"));u.hostname="127.0.0.1";u.port="${localPort}";process.env.PG_URI=u.toString().replace("/dbname",":dbname");const p=Bun.spawnSync(["bunx","--bun","drizzle-kit","migrate"],{cwd:"${server}",stdout:"inherit",stderr:"inherit",env:process.env});process.exit(p.exitCode??1)`,
		]);
	});
}
