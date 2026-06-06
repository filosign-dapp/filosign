import {
	generateColdInvitePhrase,
	randomBytes,
	toHex,
	wrapColdInviteDek,
} from "@filosign/crypto-utils";
import type { SendFileColdInvite } from "./types";

export type ColdInviteRow = {
	email: string;
	inviteToken: string;
	wrappedEncryptionKey: string;
	isSigner: boolean;
};

export type PreparedColdInvites = {
	rows: ColdInviteRow[];
	phrase?: string;
	shareCode?: {
		phrase: string;
		inviteToken: string;
		emails: string[];
	};
};

export async function prepareColdInvites(args: {
	coldInvites: SendFileColdInvite[] | undefined;
	encryptionKey: Uint8Array;
	pieceCid: { toString(): string } | null | undefined;
}): Promise<PreparedColdInvites> {
	if (!args.coldInvites?.length || !args.pieceCid) {
		return { rows: [] };
	}

	const phrase = generateColdInvitePhrase();
	const inviteToken = toHex(randomBytes(32));
	const wrapped = toHex(
		await wrapColdInviteDek({
			encryptionKey: args.encryptionKey,
			phrase,
		}),
	);
	const rows = args.coldInvites.map((c) => ({
		email: c.email.trim().toLowerCase(),
		inviteToken,
		wrappedEncryptionKey: wrapped,
		isSigner: c.isSigner,
	}));

	return {
		rows,
		phrase,
		shareCode: {
			phrase,
			inviteToken,
			emails: rows.map((r) => r.email),
		},
	};
}
