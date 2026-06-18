import {
	activeLegalAssent,
	activePilotAddendumAssent,
	isCurrentLegalAssent,
	isCurrentPilotAddendumAssent,
	type RegistrationLegalAssent,
} from "@filosign/shared";

const STORAGE_KEY = "filosign.legalAssent";
const MAX_AGE_MS = 30 * 60 * 1000;

type StoredLegalAssent = RegistrationLegalAssent & {
	storedAt: number;
};

export type { RegistrationLegalAssent };

export const LEGAL_ASSENT_REQUIRED_MESSAGE =
	"Accept the Terms of Service and Privacy Policy on this page, then try again.";

export function storeLegalAssent(options?: {
	includePilotAddendum?: boolean;
}): void {
	if (typeof sessionStorage === "undefined") return;
	const payload: StoredLegalAssent = {
		...activeLegalAssent(),
		storedAt: Date.now(),
		...(options?.includePilotAddendum
			? { pilotAddendum: activePilotAddendumAssent() }
			: {}),
	};
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readStoredLegalAssent(): RegistrationLegalAssent | null {
	if (typeof sessionStorage === "undefined") return null;
	const raw = sessionStorage.getItem(STORAGE_KEY);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as StoredLegalAssent;
		if (!parsed.storedAt || Date.now() - parsed.storedAt > MAX_AGE_MS) {
			clearStoredLegalAssent();
			return null;
		}
		if (!isCurrentLegalAssent(parsed)) {
			clearStoredLegalAssent();
			return null;
		}
		if (
			parsed.pilotAddendum &&
			!isCurrentPilotAddendumAssent(parsed.pilotAddendum)
		) {
			clearStoredLegalAssent();
			return null;
		}
		const { storedAt: _storedAt, ...assent } = parsed;
		return assent;
	} catch {
		return null;
	}
}

export function clearStoredLegalAssent(): void {
	if (typeof sessionStorage === "undefined") return;
	sessionStorage.removeItem(STORAGE_KEY);
}

export function isLegalAssentRequiredError(message: string | null | undefined) {
	return message === LEGAL_ASSENT_REQUIRED_MESSAGE;
}
