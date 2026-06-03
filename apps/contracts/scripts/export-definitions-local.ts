/**
 * Writes definitions/local.ts from compiled artifacts (no chain deploy).
 * Run after `bun compile` from apps/contracts.
 */
import { writeFile } from "node:fs/promises";
import hre from "hardhat";
import { toHex } from "viem";

const CHAIN_ID_LOCAL = 31337;
const PREFIX = "export const definitions = ";
const SUFFIX = " as const;";

function abiFromArtifact(name: string) {
	const artifact = hre.artifacts.readArtifactSync(name);
	return {
		address: "0x0000000000000000000000000000000000000000",
		abi: artifact.abi,
	};
}

async function main() {
	const definitions = {
		FSEnvelopeRegistry: abiFromArtifact("FSEnvelopeRegistry"),
		FSPaymentValidator: abiFromArtifact("FSPaymentValidator"),
		FSAttachmentRelease: abiFromArtifact("FSAttachmentRelease"),
		MockUSDC: abiFromArtifact("MockUSDC"),
	} as const;

	const body =
		PREFIX +
		JSON.stringify({ [toHex(CHAIN_ID_LOCAL)]: definitions }, null, 2) +
		SUFFIX;

	await writeFile("definitions/local.ts", body);
	console.log("Wrote definitions/local.ts from artifacts");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
