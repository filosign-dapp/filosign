import { createHash } from "node:crypto";
import { type Hex, hexToBytes } from "viem";

export function sha256HexUtf8(s: string): `0x${string}` {
	const hex = createHash("sha256").update(s, "utf8").digest("hex");
	return `0x${hex}` as `0x${string}`;
}

export function sha256HexOfHexBytes(h: Hex): `0x${string}` {
	const bytes = hexToBytes(h);
	const hex = createHash("sha256").update(bytes).digest("hex");
	return `0x${hex}` as `0x${string}`;
}
