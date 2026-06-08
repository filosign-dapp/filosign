import type { Address } from "viem";
import { getAddress } from "viem";

export type SenderProfileFields = {
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	username: string | null;
};

export function resolvePartyLabel(
	profile: SenderProfileFields | null | undefined,
	wallet: Address,
): string {
	const fullName = [profile?.firstName, profile?.lastName]
		.filter(Boolean)
		.join(" ")
		.trim();
	if (fullName) return fullName;

	const email = profile?.email?.trim();
	if (email) {
		const localPart = email.split("@")[0]?.trim();
		if (localPart) return localPart;
	}

	const username = profile?.username?.trim();
	if (username) return username;

	const normalized = getAddress(wallet);
	return `${normalized.slice(0, 6)}…${normalized.slice(-4)}`;
}
