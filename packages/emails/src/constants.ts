import { type FilosignContactEmail, filosignMailto } from "./contact-emails";

export const FILOSIGN_FOOTER_TAGLINE =
	"Filosign helps teams run agreement workflows from signature to release.";

export function filosignFooterLinks(
	contactChannel: FilosignContactEmail = "contract",
) {
	return {
		email: {
			href: filosignMailto(contactChannel),
			label: "Email",
		},
		x: {
			href: "https://x.com/filosign",
			label: "X",
		},
		website: {
			href: "https://filosign.xyz",
			label: "Website",
		},
	} as const;
}

/** Default footer links for agreement workflow emails. */
export const FILOSIGN_FOOTER_LINKS = filosignFooterLinks("contract");
