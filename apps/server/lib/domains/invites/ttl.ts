import env from "@/env";

export function inviteTtlDays(): number {
	return env.INVITE_TTL_DAYS;
}

export function inviteTtlMs(): number {
	return inviteTtlDays() * 24 * 60 * 60 * 1000;
}

export function inviteExpiresAt(from = Date.now()): Date {
	return new Date(from + inviteTtlMs());
}
