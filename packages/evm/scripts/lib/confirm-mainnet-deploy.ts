import { readFile } from "node:fs/promises";
import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { evmPackageDir } from "./repo-paths.js";

const MAINNET_CHAIN_ID = 8453;
const CONFIRM_KEYWORD = "confirm";

async function existingMainnetDeploymentSummary(): Promise<string> {
	const defsDir = path.join(evmPackageDir(), "definitions");
	try {
		const latest = JSON.parse(
			await readFile(path.join(defsDir, "chains/mainnet/latest.json"), "utf8"),
		) as { deploymentId: string };
		const manifest = JSON.parse(
			await readFile(
				path.join(
					defsDir,
					`chains/mainnet/deployments/${latest.deploymentId}/manifest.json`,
				),
				"utf8",
			),
		) as { contracts: Record<string, { address: string }> };
		const lines = Object.entries(manifest.contracts).map(
			([name, c]) => `    ${name}: ${c.address}`,
		);
		return `\nExisting mainnet deployment (${latest.deploymentId}):\n${lines.join("\n")}\n`;
	} catch {
		return "\n(No prior mainnet deployment manifest found.)\n";
	}
}

/** Blocks accidental Base mainnet deploys unless the operator types `confirm`. */
export async function requireMainnetDeployConfirmation(
	chainId: number,
): Promise<void> {
	if (chainId !== MAINNET_CHAIN_ID) return;

	const existing = await existingMainnetDeploymentSummary();

	console.error(
		[
			"",
			"!!! MAINNET DEPLOY GUARD !!!",
			"",
			"You are about to deploy NEW contracts to Base mainnet (chainId 8453).",
			"This deploys fresh registry, validator, and attachment contracts.",
			"Proceed only for an intentional first deploy or explicit redeploy.",
			existing,
			`Type "${CONFIRM_KEYWORD}" to continue, or anything else to abort.`,
			"",
		].join("\n"),
	);

	if (!input.isTTY) {
		console.error(
			"Refusing mainnet deploy: stdin is not a TTY (non-interactive).",
		);
		process.exit(1);
	}

	const rl = createInterface({ input, output });
	try {
		const answer = (await rl.question("> ")).trim();
		if (answer !== CONFIRM_KEYWORD) {
			console.error("Mainnet deploy aborted.");
			process.exit(1);
		}
	} finally {
		rl.close();
	}
}
