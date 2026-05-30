import hre from "hardhat";
import type { PublicClient } from "viem";

/** Use chain time for EIP-712 payloads — `block.timestamp` must align with `SIGNATURE_VALIDITY_PERIOD`. */
export async function latestBlockTimestamp(
	publicClient: PublicClient,
): Promise<bigint> {
	const block = await publicClient.getBlock({ blockTag: "latest" });
	if (block?.timestamp == null) {
		throw new Error("latest block timestamp unavailable");
	}
	return block.timestamp;
}

/** Advance Hardhat chain time and mine a block (for expiry tests). */
export async function advanceBlockTime(
	publicClient: PublicClient,
	seconds: number,
): Promise<bigint> {
	void publicClient;
	await hre.network.provider.send("evm_increaseTime", [seconds]);
	await hre.network.provider.send("evm_mine", []);
	return latestBlockTimestamp(await hre.viem.getPublicClient());
}
