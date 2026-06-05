import { CONTAINERS } from "./context.ts";
import { sshCapture } from "./ssh.ts";
import type { ProdContext } from "./types.ts";

const LOCAL_PG_PORT = 5433;

export async function postgresContainerIp(ctx: ProdContext): Promise<string> {
	const r = await sshCapture(
		ctx,
		`docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${CONTAINERS.postgres}`,
	);
	if (r.code !== 0 || !r.stdout.trim()) {
		throw new Error(
			r.stderr || `Could not resolve IP for ${CONTAINERS.postgres}`,
		);
	}
	return r.stdout.trim();
}

export async function withPostgresTunnel<T>(
	ctx: ProdContext,
	fn: (localPort: number) => Promise<T>,
): Promise<T> {
	const ip = await postgresContainerIp(ctx);
	const tunnel = Bun.spawn({
		cmd: ["ssh", "-N", "-L", `${LOCAL_PG_PORT}:${ip}:5432`, ctx.ssh],
		stdout: "ignore",
		stderr: "inherit",
	});
	await Bun.sleep(1000);
	try {
		return await fn(LOCAL_PG_PORT);
	} finally {
		tunnel.kill();
	}
}
