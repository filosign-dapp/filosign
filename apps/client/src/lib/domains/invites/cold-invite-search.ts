import { type Address, getAddress } from "viem";
import { z } from "zod";

export const coldInviteEntrySearchSchema = z.object({
	coldPieceCid: z.string().optional().default(""),
	coldInvite: z.string().optional().default(""),
	/** Set to `"1"` when user chose "Continue anyway" after invite mismatch—skip document redirect. */
	skipColdSign: z.string().optional().default(""),
});

export type ColdInviteEntrySearch = z.infer<typeof coldInviteEntrySearchSchema>;

/** Query value for {@link ColdInviteEntrySearch.skipColdSign} when deferring cold document open. */
export const SKIP_COLD_SIGN_AFTER_MISMATCH = "1";

export function shouldSkipColdDocumentAfterMismatch(
	search: ColdInviteEntrySearch,
): boolean {
	return search.skipColdSign?.trim() === SKIP_COLD_SIGN_AFTER_MISMATCH;
}

/** Cold sign URL unless user explicitly skipped opening the document after a mismatch. */
export function signDocumentSearchFromColdEntry(
	search: ColdInviteEntrySearch,
): SignDocumentColdSearch | null {
	if (shouldSkipColdDocumentAfterMismatch(search)) return null;
	return toSignDocumentSearch(search);
}

export function hasColdReturn(search: ColdInviteEntrySearch): boolean {
	const c = search.coldPieceCid?.trim();
	const i = search.coldInvite?.trim();
	return Boolean(c && i);
}

export type SignDocumentColdSearch = { pieceCid: string; invite: string };

export function toSignDocumentSearch(
	search: ColdInviteEntrySearch,
): SignDocumentColdSearch | null {
	const pieceCid = search.coldPieceCid?.trim() ?? "";
	const invite = search.coldInvite?.trim() ?? "";
	if (!pieceCid || !invite) return null;
	return { pieceCid, invite };
}

export function buildColdInviteMagicLink(
	origin: string,
	args: { pieceCid: string; inviteToken: string },
): string {
	const u = new URL("/", origin);
	u.searchParams.set("coldPieceCid", args.pieceCid);
	u.searchParams.set("coldInvite", args.inviteToken);
	return u.toString();
}

function searchParamsFromLocationSearch(search: string): URLSearchParams {
	const raw = search.startsWith("?") ? search.slice(1) : search;
	return new URLSearchParams(raw);
}

/** Parse cold-invite query from a location `search` string (with or without leading `?`). */
export function parseColdInviteFromLocationSearch(
	search: string,
): { coldPieceCid: string; coldInvite: string } | undefined {
	const params = searchParamsFromLocationSearch(search);
	let coldPieceCid = params.get("coldPieceCid")?.trim() ?? "";
	let coldInvite = params.get("coldInvite")?.trim() ?? "";
	if (!coldPieceCid || !coldInvite) {
		const pieceCid = params.get("pieceCid")?.trim() ?? "";
		const invite = params.get("invite")?.trim() ?? "";
		if (pieceCid && invite) {
			coldPieceCid = pieceCid;
			coldInvite = invite;
		}
	}
	if (!coldPieceCid || !coldInvite) return undefined;
	return { coldPieceCid, coldInvite };
}

/**
 * True if the current user is allowed for this cold invite: sender wallet matches, or
 * Privy primary / Google email matches a recipient row, or Filosign profile email matches.
 */
export function coldInviteRecipientMatchesIdentity(args: {
	recipientEmails: readonly string[];
	loggedInEmail: string;
	profileEmail?: string | null | undefined;
	senderWallet?: string | null | undefined;
	inviteSender: string;
}): boolean {
	const set = new Set(
		args.recipientEmails.map((e) => e.trim().toLowerCase()).filter(Boolean),
	);
	if (args.senderWallet?.trim() && args.inviteSender.trim()) {
		try {
			if (
				getAddress(args.senderWallet as Address) ===
				getAddress(args.inviteSender as Address)
			) {
				return true;
			}
		} catch {
			/* invalid address */
		}
	}
	const logged = args.loggedInEmail.trim().toLowerCase();
	if (logged && set.has(logged)) return true;
	const profile = (args.profileEmail ?? "").trim().toLowerCase();
	if (profile && set.has(profile)) return true;
	return false;
}

/**
 * Reads cold-invite params from the current URL (`coldPieceCid` + `coldInvite`), or maps
 * `/dashboard/document/sign` query `pieceCid` + `invite` into the same shape.
 *
 * Call synchronously before async work (e.g. Privy logout) that may redirect and clear
 * `window.location.search`.
 */
export function extractColdInviteSearchFromLocation():
	| {
			coldPieceCid: string;
			coldInvite: string;
	  }
	| undefined {
	if (typeof window === "undefined") return undefined;
	return parseColdInviteFromLocationSearch(window.location.search);
}
