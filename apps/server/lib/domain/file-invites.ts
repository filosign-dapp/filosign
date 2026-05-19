import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { eq, inArray } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/db";

const { users } = db.schema;

export const COLD_INVITE_TTL_DAYS = 7;
export const COLD_INVITE_TTL_MS = COLD_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;

export const coldInviteExpiry = () => new Date(Date.now() + COLD_INVITE_TTL_MS);

export function isSenderAlreadyApprovedError(err: unknown): boolean {
	const msg = err instanceof Error ? err.message : String(err);
	return msg.includes("SenderAlreadyApproved");
}

export async function primaryEmailForWallet(
	wallet: Address,
): Promise<string | null> {
	const [row] = await db
		.select({ email: users.email })
		.from(users)
		.where(eq(users.walletAddress, getAddress(wallet)));
	const e = row?.email?.trim();
	return e ? normalizePlacementRecipientEmail(e) : null;
}

export function coldInviteSenderLabel(args: {
	senderWallet: string;
	email: string | null | undefined;
	firstName: string | null | undefined;
	lastName: string | null | undefined;
}): string {
	const email = args.email?.trim();
	const parts = [args.firstName?.trim(), args.lastName?.trim()].filter(
		(x): x is string => Boolean(x && x.length > 0),
	);
	const name = parts.join(" ");
	if (name && email) return `${name} (${email})`;
	if (email) return `(${email})`;
	return getAddress(args.senderWallet as Address);
}

export async function normalizedViewerEmailsForRegister(args: {
	participants: { address: string; isSigner?: boolean }[];
	coldInvites: { email: string; isSigner: boolean }[];
}): Promise<string[]> {
	const emails = new Set<string>();
	const viewerWallets = args.participants
		.filter((p) => !p.isSigner)
		.map((p) => getAddress(p.address as Address));
	if (viewerWallets.length > 0) {
		const rows = await db
			.select({ email: users.email })
			.from(users)
			.where(inArray(users.walletAddress, viewerWallets));
		for (const row of rows) {
			const e = row.email?.trim();
			if (e) emails.add(normalizePlacementRecipientEmail(e));
		}
	}
	for (const c of args.coldInvites) {
		if (!c.isSigner)
			emails.add(normalizePlacementRecipientEmail(c.email.trim()));
	}
	return [...emails];
}
