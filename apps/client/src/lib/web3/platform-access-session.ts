import type { ColdInviteEntrySearch } from "@/src/lib/domains/invites/cold-invite-search";

const STORAGE_KEY = "filosign.platformAccessGate";

export type StoredAccessGate = {
	platformInviteToken?: string;
	setupToken?: string;
	coldInviteToken?: string;
	coldRecipientEmail?: string;
};

export function accessGateFromSearch(
	search: ColdInviteEntrySearch,
): StoredAccessGate {
	const gate: StoredAccessGate = {};
	const platformInvite = search.platformInvite?.trim();
	const setup = search.setup?.trim();
	const coldInvite = search.coldInvite?.trim();
	const email = search.email?.trim().toLowerCase();
	if (platformInvite) gate.platformInviteToken = platformInvite;
	if (setup) gate.setupToken = setup;
	if (coldInvite) gate.coldInviteToken = coldInvite;
	if (email) gate.coldRecipientEmail = email;
	return gate;
}

export function storeAccessGate(gate: StoredAccessGate): void {
	if (typeof sessionStorage === "undefined") return;
	if (Object.keys(gate).length === 0) return;
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify(gate));
}

export function readStoredAccessGate(): StoredAccessGate | null {
	if (typeof sessionStorage === "undefined") return null;
	const raw = sessionStorage.getItem(STORAGE_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as StoredAccessGate;
	} catch {
		return null;
	}
}

export function clearStoredAccessGate(): void {
	if (typeof sessionStorage === "undefined") return;
	sessionStorage.removeItem(STORAGE_KEY);
}
