import type { Profile } from "thirdweb/wallets";

/** Primary login email (email profile, else Google) and Google-linked email. */
export function profileEmailsFromThirdwebProfiles(
	profiles: Profile[] | undefined,
): { email: string; googleEmail: string } {
	let emailFromEmail = "";
	let emailFromGoogle = "";
	let googleEmail = "";
	if (!profiles?.length) {
		return { email: "", googleEmail: "" };
	}

	for (const profile of profiles) {
		const trimmed = profile.details.email?.trim();
		if (!trimmed) continue;

		if (profile.type === "email" && !emailFromEmail) {
			emailFromEmail = trimmed;
		} else if (profile.type === "google") {
			if (!googleEmail) googleEmail = trimmed;
			if (!emailFromGoogle) emailFromGoogle = trimmed;
		}
	}

	return {
		email: emailFromEmail || emailFromGoogle,
		googleEmail,
	};
}
