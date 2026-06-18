export const ACTIVE_TERMS_VERSION = "2026-06-20";
export const ACTIVE_PRIVACY_VERSION = "2026-06-20";

/** SHA-256 of the versioned Astro source presented for acceptance. */
export const ACTIVE_TERMS_SHA256 =
	"41ccd77014d5a6e9e91a6d29407e7ffa346639c93372be814c03cc911e0d7727";
export const ACTIVE_PRIVACY_SHA256 =
	"6e51635208f0bf1cf5d861ceca75d5cd695aedee76d314a2bc3a22512e6c644c";

export const ACTIVE_PILOT_ADDENDUM_VERSION = "2026-06-20";

/** SHA-256 of design-partner-addendum.astro source at acceptance time. */
export const ACTIVE_PILOT_ADDENDUM_SHA256 =
	"ba10f8864379b44168c89426d3c1294b757f1b7c75216f5aa01eb844fc920baf";

export type LegalAssent = {
	acceptTerms: true;
	businessUseAttestation: true;
	termsVersion: string;
	privacyVersion: string;
	termsSha256: string;
	privacySha256: string;
};

export type PilotAddendumAssent = {
	acceptPilotAddendum: true;
	addendumVersion: string;
	addendumSha256: string;
};

export type RegistrationLegalAssent = LegalAssent & {
	pilotAddendum?: PilotAddendumAssent;
};

export function activeLegalAssent(): LegalAssent {
	return {
		acceptTerms: true,
		businessUseAttestation: true,
		termsVersion: ACTIVE_TERMS_VERSION,
		privacyVersion: ACTIVE_PRIVACY_VERSION,
		termsSha256: ACTIVE_TERMS_SHA256,
		privacySha256: ACTIVE_PRIVACY_SHA256,
	};
}

export function activePilotAddendumAssent(): PilotAddendumAssent {
	return {
		acceptPilotAddendum: true,
		addendumVersion: ACTIVE_PILOT_ADDENDUM_VERSION,
		addendumSha256: ACTIVE_PILOT_ADDENDUM_SHA256,
	};
}

export function isCurrentLegalAssent(assent: LegalAssent): boolean {
	const current = activeLegalAssent();
	return (
		assent.acceptTerms === true &&
		assent.businessUseAttestation === true &&
		assent.termsVersion === current.termsVersion &&
		assent.privacyVersion === current.privacyVersion &&
		assent.termsSha256 === current.termsSha256 &&
		assent.privacySha256 === current.privacySha256
	);
}

export function isCurrentPilotAddendumAssent(
	assent: PilotAddendumAssent,
): boolean {
	const current = activePilotAddendumAssent();
	return (
		assent.acceptPilotAddendum === true &&
		assent.addendumVersion === current.addendumVersion &&
		assent.addendumSha256 === current.addendumSha256
	);
}
