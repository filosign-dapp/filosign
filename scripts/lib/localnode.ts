import { die } from "./cli.ts";
import { packageRunCmd } from "./run.ts";
import { runInherit } from "./spawn.ts";

const HARDHAT_RPC = "http://127.0.0.1:8545";

async function rpcCall(
	method: string,
	params: unknown[] = [],
): Promise<unknown> {
	try {
		const res = await fetch(HARDHAT_RPC, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				method,
				params,
				id: 1,
			}),
			signal: AbortSignal.timeout(2_000),
		});
		if (!res.ok) return undefined;
		const json = (await res.json()) as { result?: unknown; error?: unknown };
		if (json.error) return undefined;
		return json.result;
	} catch {
		return undefined;
	}
}

async function portHasJsonRpc(): Promise<boolean> {
	return (await rpcCall("eth_blockNumber")) !== undefined;
}

/** True when :8545 is a Hardhat node (not Anvil/other on 31337). */
async function hardhatNodeReady(): Promise<boolean> {
	return (await rpcCall("hardhat_metadata")) !== undefined;
}

/** Start Hardhat JSON-RPC on :8545 if nothing is listening (no deploy/DB). */
export async function ensureHardhatNode(rootDir: string): Promise<void> {
	if (await portHasJsonRpc()) {
		if (await hardhatNodeReady()) {
			console.log("Hardhat node already running on :8545\n");
			return;
		}
		die(
			"Port :8545 is in use but is not a Hardhat node (missing hardhat_metadata). " +
				"Stop the other process (e.g. Anvil) or run: bun run contracts -- node",
		);
	}

	console.log("Starting Hardhat node on :8545…\n");
	Bun.spawn({
		cmd: packageRunCmd(rootDir, "@filosign/contracts", "node"),
		cwd: rootDir,
		stdout: "inherit",
		stderr: "inherit",
		stdin: "ignore",
	});

	for (let i = 0; i < 30; i++) {
		await Bun.sleep(500);
		if (await hardhatNodeReady()) {
			console.log("Hardhat node ready\n");
			return;
		}
	}

	die("Hardhat node did not become ready on :8545");
}

/** Full local bootstrap: node, DB purge, compile, deploy. */
export async function runLocalBootstrap(rootDir: string): Promise<void> {
	await ensureHardhatNode(rootDir);

	const steps: string[][] = [
		["bun", "run", "db", "--", "purge", "local"],
		["bun", "run", "contracts", "--", "compile"],
		["bun", "run", "contracts", "--", "--migrate", "--local"],
	];

	for (const cmd of steps) {
		const code = await runInherit(rootDir, cmd);
		if (code !== 0) process.exit(code);
	}

	console.log("Local bootstrap finished\n");
}
