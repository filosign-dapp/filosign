import type { Address } from "viem";

export type ParticipantRow = {
	wallet: Address;
	role: "sender" | "viewer" | "signer";
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	username: string | null;
	authProviderId: string | null;
};

export function displayNameFromUser(p: ParticipantRow): string | null {
	const n = [p.firstName, p.lastName].filter(Boolean).join(" ");
	if (n.trim()) return n.trim();
	return p.username?.trim() || null;
}

export function roleOrder(r: ParticipantRow["role"]): number {
	if (r === "sender") return 0;
	if (r === "signer") return 1;
	return 2;
}

export type TxDraft = {
	kind: import("@filosign/shared").ComplianceBundle["transactions"][number]["kind"];
	txHash: import("viem").Hex;
	contractAddress: Address;
	summary: string;
	relatedAddresses: Address[];
};
