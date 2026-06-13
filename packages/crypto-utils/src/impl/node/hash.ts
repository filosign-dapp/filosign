import { type ByteArray, encodePacked, type Hex, isHex, keccak256 } from "viem";

/** Keccak-256 over packed string or raw bytes - pre-hash for Dilithium sign/verify. */
export function digest(value: Hex | ByteArray | string) {
	if (typeof value === "string" && !isHex(value)) {
		return keccak256(encodePacked(["string"], [value]));
	}
	return keccak256(value);
}
