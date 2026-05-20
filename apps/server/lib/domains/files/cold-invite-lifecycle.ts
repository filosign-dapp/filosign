import type { Address } from "viem";

export function redactColdInviteRow(claimedByWallet: Address) {
	return {
		status: "claimed" as const,
		claimedAt: new Date(),
		claimedByWallet,
		inviteToken: null,
		wrappedEncryptionKey: null,
		updatedAt: new Date(),
	};
}
