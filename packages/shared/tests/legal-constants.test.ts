import { describe, expect, test } from "bun:test";
import {
	ACTIVE_PILOT_ADDENDUM_SHA256,
	ACTIVE_PILOT_ADDENDUM_VERSION,
	ACTIVE_PRIVACY_SHA256,
	ACTIVE_PRIVACY_VERSION,
	ACTIVE_TERMS_SHA256,
	ACTIVE_TERMS_VERSION,
	activeLegalAssent,
	activePilotAddendumAssent,
	isCurrentLegalAssent,
	isCurrentPilotAddendumAssent,
} from "@filosign/shared";

describe("legal constants", () => {
	test("activeLegalAssent matches current version constants", () => {
		expect(activeLegalAssent()).toEqual({
			acceptTerms: true,
			businessUseAttestation: true,
			termsVersion: ACTIVE_TERMS_VERSION,
			privacyVersion: ACTIVE_PRIVACY_VERSION,
			termsSha256: ACTIVE_TERMS_SHA256,
			privacySha256: ACTIVE_PRIVACY_SHA256,
		});
	});

	test("activePilotAddendumAssent matches current addendum constants", () => {
		expect(activePilotAddendumAssent()).toEqual({
			acceptPilotAddendum: true,
			addendumVersion: ACTIVE_PILOT_ADDENDUM_VERSION,
			addendumSha256: ACTIVE_PILOT_ADDENDUM_SHA256,
		});
	});

	test("isCurrentLegalAssent rejects stale document versions", () => {
		const assent = activeLegalAssent();
		expect(isCurrentLegalAssent(assent)).toBe(true);
		expect(
			isCurrentLegalAssent({
				...assent,
				termsVersion: "2020-01-01",
			}),
		).toBe(false);
	});

	test("isCurrentPilotAddendumAssent rejects stale addendum versions", () => {
		const assent = activePilotAddendumAssent();
		expect(isCurrentPilotAddendumAssent(assent)).toBe(true);
		expect(
			isCurrentPilotAddendumAssent({
				...assent,
				addendumVersion: "2020-01-01",
			}),
		).toBe(false);
	});
});
