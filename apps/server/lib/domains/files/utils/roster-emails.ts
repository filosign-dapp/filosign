import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { inArray } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";

const { users } = db.schema;

export async function compileRegisterRosterEmails(args: {
	senderEmail: string;
	participants: { address: Address; isSigner?: boolean }[];
	coldInvites: { email: string }[];
}): Promise<string[]> {
	const seen = new Set<string>();
	const roster: string[] = [];

	const addEmail = (raw: string) => {
		const email = normalizePlacementRecipientEmail(raw.trim());
		if (!email || seen.has(email)) return;
		seen.add(email);
		roster.push(email);
	};

	addEmail(args.senderEmail);

	for (const invite of args.coldInvites) {
		addEmail(invite.email);
	}

	const participantWallets = [
		...new Set(args.participants.map((p) => getAddress(p.address))),
	];
	if (participantWallets.length > 0) {
		const rows = await db
			.select({ email: users.email })
			.from(users)
			.where(inArray(users.walletAddress, participantWallets));
		for (const row of rows) {
			const email = row.email?.trim();
			if (email) addEmail(email);
		}
	}

	return roster;
}
