import type { Chain } from "viem";
import { defaultChain } from "@/src/constants";

/** Runtime chain for treasury connect, typed data, and Safe TX service routing. */
export function treasuryChain(): Chain {
	return defaultChain;
}

export function treasuryChainId(): number {
	return treasuryChain().id;
}
