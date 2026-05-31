import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import env from "@/env";
import db from "@/lib/platform/db";
import { users } from "@/lib/platform/db/schema/user";

export function normalizeAdminEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function parsePlatformAdminEmails(): Set<string> {
	const raw = env.PLATFORM_ADMIN_EMAILS?.trim();
	if (!raw) return new Set();
	return new Set(
		raw
			.split(",")
			.map((e) => normalizeAdminEmail(e))
			.filter(Boolean),
	);
}

export function isPlatformAdminEmail(
	email: string | null | undefined,
): boolean {
	if (!email?.trim()) return false;
	return parsePlatformAdminEmails().has(normalizeAdminEmail(email));
}

function parseAdminWallets(): Set<string> {
	const raw = env.ADMIN_WALLETS?.trim();
	if (!raw) return new Set();
	return new Set(
		raw
			.split(",")
			.map((w) => w.trim().toLowerCase())
			.filter(Boolean),
	);
}

export function isPlatformAdminWallet(wallet: Address): boolean {
	const admins = parseAdminWallets();
	if (admins.size === 0) return false;
	return admins.has(getAddress(wallet).toLowerCase());
}

/** Platform admin: env email list and/or legacy ADMIN_WALLETS break-glass. */
export async function assertPlatformAdmin(wallet: Address): Promise<void> {
	const walletNorm = getAddress(wallet);

	if (isPlatformAdminWallet(walletNorm)) return;

	const emails = parsePlatformAdminEmails();
	if (emails.size === 0) {
		throw new ORPCError("FORBIDDEN", {
			message: "Platform admin is not configured",
		});
	}

	const [row] = await db
		.select({ email: users.email })
		.from(users)
		.where(eq(users.walletAddress, walletNorm))
		.limit(1);

	if (!row?.email || !emails.has(normalizeAdminEmail(row.email))) {
		throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
	}
}

export async function isPlatformAdminForWallet(
	wallet: Address,
): Promise<boolean> {
	try {
		await assertPlatformAdmin(wallet);
		return true;
	} catch {
		return false;
	}
}

/**
 * Platform admin signup/login gate bypass — all deployments (including production).
 * Use this anywhere invite-only policy would block an admin email.
 */
export function allowsPlatformAdminAccess(
	email: string | null | undefined,
): boolean {
	return isPlatformAdminEmail(email);
}

/** Write Teams Pro subscription rows for platform admin emails (all deployments). */
export function shouldAutoGrantTeamsProForAdminEmail(
	email: string | null | undefined,
): boolean {
	return isPlatformAdminEmail(email);
}
