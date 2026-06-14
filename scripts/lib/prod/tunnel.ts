import { connect } from "node:net";
import { createProdLog, type ProdLog } from "./log.ts";
import { sshCapture } from "./ssh.ts";
import type { ProdContext } from "./types.ts";

const LOCAL_PG_PORT = 5433;
/** compose.data.yml publishes Postgres on VPS loopback only */
const VPS_PG_LOOPBACK = "127.0.0.1:5432";

export async function postgresContainerIp(ctx: ProdContext): Promise<string> {
	const r = await sshCapture(
		ctx,
		`docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${ctx.containers.postgres}`,
	);
	if (r.code !== 0 || !r.stdout.trim()) {
		throw new Error(
			r.stderr || `Could not resolve IP for ${ctx.containers.postgres}`,
		);
	}
	return r.stdout.trim();
}

function probeLocalPort(port: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const socket = connect({ host: "127.0.0.1", port });
		socket.once("connect", () => {
			socket.end();
			resolve();
		});
		socket.once("error", reject);
	});
}

async function waitForLocalPort(port: number, timeoutMs = 8000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			await probeLocalPort(port);
			return;
		} catch {
			await Bun.sleep(150);
		}
	}
	throw new Error(
		`127.0.0.1:${port} is not accepting connections. ` +
			`SSH tunnel may have failed, or another process is already bound to that port.`,
	);
}

export async function withPostgresTunnel<T>(
	ctx: ProdContext,
	fn: (localPort: number) => Promise<T>,
): Promise<T> {
	const log: ProdLog = ctx.log ?? createProdLog(ctx.verbose);
	const remote = process.env.PROD_PG_REMOTE_HOST?.trim() || VPS_PG_LOOPBACK;
	log.info(`opening ssh tunnel via ${ctx.ssh}`);
	log.detail(`127.0.0.1:${LOCAL_PG_PORT} → ${remote}`);

	const tunnel = Bun.spawn({
		cmd: ["ssh", "-N", "-L", `${LOCAL_PG_PORT}:${remote}`, ctx.ssh],
		stdout: "ignore",
		stderr: "inherit",
	});
	await Bun.sleep(500);
	if (tunnel.exitCode != null) {
		throw new Error(
			`SSH tunnel exited immediately (code ${tunnel.exitCode}). ` +
				`Check stderr above; port ${LOCAL_PG_PORT} may already be in use on this machine.`,
		);
	}
	await waitForLocalPort(LOCAL_PG_PORT);
	try {
		return await fn(LOCAL_PG_PORT);
	} finally {
		tunnel.kill();
		log.info("closed ssh tunnel");
	}
}
