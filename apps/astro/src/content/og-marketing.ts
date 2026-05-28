import { defaultDescription, defaultTitle } from "../config/site";

/**
 * Open Graph card copy — keep in sync with each page’s `<BaseLayout title/description>`.
 * Keys map to URL → {@link ../lib/og-slug.ts ogSlugFromPathname}.
 */
export const MARKETING_OG_PAGES = {
	index: {
		title: defaultTitle,
		description: defaultDescription,
	},
	about: {
		title: "About Filosign — Transforming document signing",
		description:
			"Filosign transforms document signing with secure, decentralized workflows—wallet identity, E2EE, and on-chain proof for the modern web.",
	},
	pricing: {
		title: "Pricing — Secure signing for every scale",
		description:
			"Filosign plans from free to enterprise: encrypted signing, Filecoin storage, and USDC settlements. Start free and scale with your team.",
	},
	changelog: {
		title: "Changelog — What's new at Filosign",
		description:
			"Product updates, design improvements, and new features on Filosign. Stay current with releases for signing, storage, and settlements.",
	},
	blog: {
		title: "Blog — News and updates from Filosign",
		description:
			"Engineering and product notes from Filosign: E2EE signing, placement manifests, wallet unlock, and decentralized agreement infrastructure.",
	},
	privacy: {
		title: "Privacy Policy — Filosign",
		description:
			"How Filosign handles personal data for document signing, wallet authentication, and optional USDC payout features.",
	},
	terms: {
		title: "Terms of Service — Filosign",
		description:
			"Terms of Service for Filosign document signing software and optional on-chain USDC payout automation.",
	},
	"blog-introduction": {
		title: "Introducing Filosign — Filosign Blog",
		description:
			"Six months ago, we started working on Filosign; an idea focused on creating a completely private and end-to-end encrypted document signing standard.",
	},
	"blog-future-of-digital-agreements": {
		title:
			"The future of digital agreements: Why we built Filosign — Filosign Blog",
		description:
			"Long-form perspective on platform risk in e-sign, Filosign's architecture on FVM, and post-quantum signing.",
	},
	"blog-unlocking-filosign-after-privy": {
		title:
			"What OAuth can't unwrap: wallet-derived unlock for Filosign's client keys — Filosign Blog",
		description:
			"Why Privy login and PQ signing seeds differ, what we tried first, and how we reuse the wallet signature chain from registration to unlock.",
	},
	"blog-placement-based-signing-infrastructure": {
		title:
			"Inside Filosign's Signing Flow: Infrastructure Built for Legal Certainty — Filosign Blog",
		description:
			"Placement manifests, Merkle proofs, compliance bundles, and on-chain attestations for independently verifiable e-signatures.",
	},
} as const;

export type MarketingOgSlug = keyof typeof MARKETING_OG_PAGES;
