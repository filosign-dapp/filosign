import { readFileSync } from "node:fs";
import path from "node:path";
import { type DeployProfile, packageDir } from "../package-paths.ts";

/** Latest persisted deployment id for testnet/mainnet, or null if none. */
export function readLatestDeploymentId(
	rootDir: string,
	profile: Exclude<DeployProfile, "local">,
): string | null {
	try {
		const evmDir = packageDir(rootDir, "@filosign/evm");
		const raw = readFileSync(
			path.join(evmDir, "definitions/chains", profile, "latest.json"),
			"utf8",
		);
		return (JSON.parse(raw) as { deploymentId: string }).deploymentId;
	} catch {
		return null;
	}
}
