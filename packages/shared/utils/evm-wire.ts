import type { Address, Hex } from "viem";
import { getAddress, isAddress, isHex } from "viem";

/** Runtime check + checksum for wire addresses (RPC, DB, wallet connectors). */
export function parseEvmAddress(value: string): Address {
	if (!isAddress(value)) {
		throw new Error(`Invalid Ethereum address: ${value}`);
	}
	return getAddress(value);
}

/** Runtime check + normalized lowercase hex for crypto / viem APIs. */
export function parseHexString(value: string): Hex {
	if (!isHex(value)) {
		throw new Error(`Invalid hex string: ${value}`);
	}
	return value.toLowerCase() as Hex;
}
