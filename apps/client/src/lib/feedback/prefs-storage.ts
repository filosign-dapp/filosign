export const FEEDBACK_PREFS_STORAGE_KEY = "filosign.feedback.prefs.v1";

export const FEEDBACK_PREFS_CHANGED_EVENT = "filosign:feedback-prefs-changed";

const GLOBAL_SNOOZE_DAYS = 14;
const SUBMISSION_COOLDOWN_DAYS = 7;

export type FeedbackPrefs = {
	tutorialFeedbackEligible: boolean;
	globalDismissed: boolean;
	globalSnoozeUntil: string | null;
	lastSubmissionAt: string | null;
	sessionCardDismissed: boolean;
};

const defaultPrefs: FeedbackPrefs = {
	tutorialFeedbackEligible: false,
	globalDismissed: false,
	globalSnoozeUntil: null,
	lastSubmissionAt: null,
	sessionCardDismissed: false,
};

function safeLocalStorage(): Storage | null {
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

function parsePrefs(raw: string | null): FeedbackPrefs {
	if (!raw) return { ...defaultPrefs };
	try {
		const parsed = JSON.parse(raw) as Partial<FeedbackPrefs>;
		return {
			tutorialFeedbackEligible: parsed.tutorialFeedbackEligible === true,
			globalDismissed: parsed.globalDismissed === true,
			globalSnoozeUntil:
				typeof parsed.globalSnoozeUntil === "string"
					? parsed.globalSnoozeUntil
					: null,
			lastSubmissionAt:
				typeof parsed.lastSubmissionAt === "string"
					? parsed.lastSubmissionAt
					: null,
			sessionCardDismissed: parsed.sessionCardDismissed === true,
		};
	} catch {
		return { ...defaultPrefs };
	}
}

function notifyChanged(): void {
	window.dispatchEvent(new CustomEvent(FEEDBACK_PREFS_CHANGED_EVENT));
}

export function readFeedbackPrefs(): FeedbackPrefs {
	const storage = safeLocalStorage();
	if (!storage) return { ...defaultPrefs };
	return parsePrefs(storage.getItem(FEEDBACK_PREFS_STORAGE_KEY));
}

export function writeFeedbackPrefs(
	updates: Partial<FeedbackPrefs>,
): FeedbackPrefs {
	const storage = safeLocalStorage();
	const next = { ...readFeedbackPrefs(), ...updates };
	if (storage) {
		try {
			storage.setItem(FEEDBACK_PREFS_STORAGE_KEY, JSON.stringify(next));
			notifyChanged();
		} catch {
			// Storage blocked.
		}
	}
	return next;
}

function parseTimestamp(iso: string | null): number | null {
	if (!iso) return null;
	const ts = Date.parse(iso);
	return Number.isFinite(ts) ? ts : null;
}

function isSnoozeActive(until: string | null): boolean {
	const ts = parseTimestamp(until);
	return ts != null && ts > Date.now();
}

function isWithinSubmissionCooldown(lastSubmissionAt: string | null): boolean {
	const ts = parseTimestamp(lastSubmissionAt);
	return (
		ts != null &&
		ts > Date.now() - SUBMISSION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
	);
}

export function recordFeedbackSubmission(): void {
	writeFeedbackPrefs({
		lastSubmissionAt: new Date().toISOString(),
		sessionCardDismissed: true,
	});
}

export function snoozeFeedbackInvite(): void {
	const until = new Date();
	until.setDate(until.getDate() + GLOBAL_SNOOZE_DAYS);
	writeFeedbackPrefs({
		globalSnoozeUntil: until.toISOString(),
		sessionCardDismissed: true,
	});
}

export function recordTutorialFeedbackEligible(): void {
	writeFeedbackPrefs({ tutorialFeedbackEligible: true });
}

export function canShowFeedbackInvite(args: {
	startHereActive: boolean;
}): boolean {
	if (args.startHereActive) return false;

	const prefs = readFeedbackPrefs();
	if (!prefs.tutorialFeedbackEligible) return false;
	if (prefs.globalDismissed || prefs.sessionCardDismissed) return false;
	if (isSnoozeActive(prefs.globalSnoozeUntil)) return false;
	if (isWithinSubmissionCooldown(prefs.lastSubmissionAt)) return false;

	return true;
}
