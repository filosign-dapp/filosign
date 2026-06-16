import { getAddress } from "viem";
import env from "../../env.js";

export const MAX_RELAYERS = 16;

export function parseRelayerPool(csv: string): `0x${string}`[] {
	const entries = csv
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
	if (entries.length === 0) {
		throw new Error("RELAYER_POOL must list at least one relayer address");
	}
	if (entries.length > MAX_RELAYERS) {
		throw new Error(`RELAYER_POOL exceeds maximum of ${MAX_RELAYERS} relayers`);
	}

	const seen = new Set<string>();
	const addresses: `0x${string}`[] = [];
	for (const entry of entries) {
		const address = getAddress(entry) as `0x${string}`;
		const key = address.toLowerCase();
		if (seen.has(key)) {
			throw new Error(`Duplicate relayer address in RELAYER_POOL: ${address}`);
		}
		seen.add(key);
		addresses.push(address);
	}
	return addresses;
}

export function parseRelayerPoolFromEnv(): `0x${string}`[] {
	return parseRelayerPool(env.RELAYER_POOL);
}
