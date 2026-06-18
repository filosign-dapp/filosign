import { describe, expect, test } from "bun:test";
import {
	ACTIVE_PRIVACY_VERSION,
	ACTIVE_TERMS_VERSION,
	activeLegalAssent,
	activePilotAddendumAssent,
} from "@filosign/shared";
import {
	clearStoredLegalAssent,
	readStoredLegalAssent,
	storeLegalAssent,
} from "@/src/lib/web3/legal-assent-session";
import { withSessionStorageStub } from "../support/session-storage-stub";

describe("legal-assent-session", () => {
	test("stores and reads current legal assent", () => {
		withSessionStorageStub(() => {
			clearStoredLegalAssent();
			expect(readStoredLegalAssent()).toBeNull();

			storeLegalAssent();
			const assent = readStoredLegalAssent();
			expect(assent).toEqual(activeLegalAssent());
			expect(assent?.termsVersion).toBe(ACTIVE_TERMS_VERSION);
			expect(assent?.privacyVersion).toBe(ACTIVE_PRIVACY_VERSION);
		});
	});

	test("stores and reads pilot addendum assent when requested", () => {
		withSessionStorageStub(() => {
			clearStoredLegalAssent();
			storeLegalAssent({ includePilotAddendum: true });
			const assent = readStoredLegalAssent();
			expect(assent?.pilotAddendum).toEqual(activePilotAddendumAssent());
		});
	});

	test("expires assent after the session TTL", () => {
		withSessionStorageStub((store) => {
			storeLegalAssent();
			const raw = store.get("filosign.legalAssent");
			expect(raw).toBeTruthy();
			if (!raw) return;

			const parsed = JSON.parse(raw) as { storedAt: number };
			store.set(
				"filosign.legalAssent",
				JSON.stringify({
					...parsed,
					storedAt: Date.now() - 31 * 60 * 1000,
				}),
			);

			expect(readStoredLegalAssent()).toBeNull();
		});
	});
});
