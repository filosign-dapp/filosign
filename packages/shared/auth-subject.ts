import type { Hex } from "viem";
import { keccak256, stringToBytes } from "viem";

const PREFIX = "filosign:privy-subject:v1:" as const;

/** Commitment for `users.authProviderId` — EIP-712 field stays `privySubjectCommitment`. */
export function hashAuthSubjectCommitment(authProviderId: string): Hex {
	const d = authProviderId.trim();
	if (!d) throw new Error("authProviderId is required");
	return keccak256(stringToBytes(`${PREFIX}${d}`)) as Hex;
}
