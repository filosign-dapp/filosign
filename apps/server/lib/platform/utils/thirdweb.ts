import { createHash } from "node:crypto";
import { type Address, getAddress } from "viem";
import env from "@/env";
import {
	assertVerifyRateLimit,
	type CachedSession,
	getCachedSession,
	setCachedSession,
} from "@/lib/platform/cache/session-cache";

const EMBEDDED_WALLET_ACCOUNTS_URL =
	"https://embedded-wallet.thirdweb.com/api/2024-05-05/accounts";

export interface ThirdwebAuthResult {
	authProviderId: string;
	email: string | null;
	walletAddress: string | null;
}

type LinkedAccount = {
	type: string;
	details?: {
		email?: string;
		phone?: string;
		address?: string;
		id?: string;
		[key: string]: string | undefined;
	};
};

type UserStatusResponse = {
	id: string;
	wallets: { address: string }[];
	linkedAccounts: LinkedAccount[];
};

function canonicalEmailFromLinkedAccounts(
	linkedAccounts: LinkedAccount[],
): string | null {
	for (const account of linkedAccounts) {
		if (account.type === "email" && account.details?.email?.trim()) {
			return account.details.email.trim();
		}
	}
	for (const account of linkedAccounts) {
		const email = account.details?.email?.trim();
		if (
			(account.type === "google" || account.type === "google_oauth") &&
			email
		) {
			return email;
		}
	}
	return null;
}

function linkedWalletAddresses(status: UserStatusResponse): string[] {
	return status.wallets
		.map((w) => w.address?.trim())
		.filter((a): a is string => Boolean(a));
}

async function fetchUserStatus(authToken: string): Promise<UserStatusResponse> {
	const res = await fetch(EMBEDDED_WALLET_ACCOUNTS_URL, {
		method: "GET",
		headers: {
			Authorization: `Bearer embedded-wallet-token:${authToken}`,
			"Content-Type": "application/json",
			"x-client-id": env.THIRDWEB_CLIENT_ID,
			"x-secret-key": env.THIRDWEB_SECRET_KEY,
		},
	});
	if (!res.ok) {
		const body = await res.text().catch(() => "Unknown error");
		throw new Error(`Thirdweb auth verification failed: ${body}`);
	}
	return (await res.json()) as UserStatusResponse;
}

/**
 * Verifies a thirdweb in-app wallet auth token and ensures linked wallets include
 * `expectedWalletAddress` when the token lists any wallets.
 */
export async function verifyThirdwebAuthTokenWithWallet(
	authToken: string,
	expectedWalletAddress: string,
): Promise<ThirdwebAuthResult> {
	const status = await fetchUserStatus(authToken);
	const linked = linkedWalletAddresses(status);
	const normalizedExpected = expectedWalletAddress.toLowerCase();

	if (linked.length > 0) {
		const match = linked.some(
			(addr) => getAddress(addr).toLowerCase() === normalizedExpected,
		);
		if (!match) {
			throw new Error(
				`Wallet address mismatch: thirdweb token wallets do not include expected ${expectedWalletAddress}`,
			);
		}
	}

	const email = canonicalEmailFromLinkedAccounts(status.linkedAccounts);
	if (!email) {
		throw new Error(
			"Email is required for registration. Please log in with email or Google.",
		);
	}

	const walletAddress =
		linked.find(
			(addr) => getAddress(addr).toLowerCase() === normalizedExpected,
		) ??
		linked[0] ??
		null;

	return {
		authProviderId: status.id,
		email,
		walletAddress,
	};
}

export async function verifiedThirdwebEmailForWallet(
	authToken: string,
	walletAddress: Address,
): Promise<string | null> {
	const result = await verifyThirdwebAuthTokenWithWallet(
		authToken,
		walletAddress,
	);
	return result.email;
}

export function linkedEmailsFromThirdwebStatus(
	status: UserStatusResponse,
): string[] {
	const seen = new Set<string>();
	const ordered: string[] = [];
	for (const account of status.linkedAccounts) {
		let raw: string | null = null;
		if (account.type === "email" && account.details?.email?.trim()) {
			raw = account.details.email.trim();
		} else if (
			(account.type === "google" || account.type === "google_oauth") &&
			account.details?.email?.trim()
		) {
			raw = account.details.email.trim();
		}
		if (raw) {
			const norm = raw.toLowerCase();
			if (!seen.has(norm)) {
				seen.add(norm);
				ordered.push(raw);
			}
		}
	}
	return ordered;
}

export async function verifiedLinkedEmailsForWallet(
	authToken: string,
	walletAddress: Address,
): Promise<string[]> {
	await verifyThirdwebAuthTokenWithWallet(authToken, walletAddress);
	const status = await fetchUserStatus(authToken);
	return linkedEmailsFromThirdwebStatus(status);
}

function tokenRateLimitId(token: string): string {
	return createHash("sha256").update(token).digest("hex").slice(0, 32);
}

export async function verifyThirdwebSession(
	authToken: string,
	expectedWallet: string,
): Promise<CachedSession> {
	const wallet = getAddress(expectedWallet);
	const cached = await getCachedSession(authToken);
	if (cached) {
		if (getAddress(cached.wallet) !== wallet) {
			throw new Error("Wallet mismatch");
		}
		return cached;
	}

	await assertVerifyRateLimit(tokenRateLimitId(authToken));
	const result = await verifyThirdwebAuthTokenWithWallet(authToken, wallet);
	const session: CachedSession = {
		wallet,
		userId: result.authProviderId,
		email: result.email ?? "",
	};
	await setCachedSession(authToken, session);
	return session;
}
