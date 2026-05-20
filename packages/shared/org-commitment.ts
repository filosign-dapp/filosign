import { type Hex, keccak256, stringToBytes } from "viem";

/** On-chain `orgIdCommitment` for RegisterFile — zero hash when personal send. */
export const ZERO_ORG_ID_COMMITMENT =
	"0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export function hashOrgIdCommitment(organizationId: string): Hex {
	return keccak256(stringToBytes(organizationId));
}
