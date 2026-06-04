import type { Chain } from "viem";
import { z } from "zod";

function isViemChain(value: unknown): value is Chain {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		typeof (value as { id: unknown }).id === "number"
	);
}

/** viem `Chain` returned by `runtime` (not JSON-serializable as a plain record). */
export const zViemChain = z.custom<Chain>(isViemChain);
