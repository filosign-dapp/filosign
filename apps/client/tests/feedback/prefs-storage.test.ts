import { beforeEach, describe, expect, test } from "bun:test";
import {
	canShowFeedbackInvite,
	FEEDBACK_PREFS_STORAGE_KEY,
	recordTutorialFeedbackEligible,
	writeFeedbackPrefs,
} from "@/src/lib/feedback/prefs-storage";
import { installLocalStorageMock } from "../support/local-storage-mock";

beforeEach(() => {
	installLocalStorageMock();
});

describe("feedback prefs storage", () => {
	test("blocks invite while start here is active", () => {
		recordTutorialFeedbackEligible();

		expect(canShowFeedbackInvite({ startHereActive: true })).toBe(false);
	});

	test("requires tutorial completion before showing invite", () => {
		expect(canShowFeedbackInvite({ startHereActive: false })).toBe(false);

		recordTutorialFeedbackEligible();
		expect(canShowFeedbackInvite({ startHereActive: false })).toBe(true);
	});

	test("hides invite while snooze is active", () => {
		const until = new Date();
		until.setDate(until.getDate() + 14);

		writeFeedbackPrefs({
			tutorialFeedbackEligible: true,
			globalSnoozeUntil: until.toISOString(),
			sessionCardDismissed: false,
		});

		expect(canShowFeedbackInvite({ startHereActive: false })).toBe(false);
	});

	test("shows invite after snooze expires", () => {
		const until = new Date();
		until.setDate(until.getDate() - 1);

		writeFeedbackPrefs({
			tutorialFeedbackEligible: true,
			globalSnoozeUntil: until.toISOString(),
			sessionCardDismissed: false,
		});

		expect(canShowFeedbackInvite({ startHereActive: false })).toBe(true);
	});

	test("blocks invite within submission cooldown", () => {
		writeFeedbackPrefs({
			tutorialFeedbackEligible: true,
			lastSubmissionAt: new Date().toISOString(),
			sessionCardDismissed: false,
		});

		expect(canShowFeedbackInvite({ startHereActive: false })).toBe(false);
	});

	test("persists prefs in local storage", () => {
		writeFeedbackPrefs({ globalDismissed: true });
		expect(localStorage.getItem(FEEDBACK_PREFS_STORAGE_KEY)).toContain(
			"globalDismissed",
		);
	});
});
