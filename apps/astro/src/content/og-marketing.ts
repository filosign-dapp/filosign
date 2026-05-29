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
		title: "About Filosign — Private agreement workflows",
		description:
			"Filosign helps teams send encrypted documents, collect verifiable signatures, and optionally settle USDC payouts.",
	},
	pricing: {
		title: "Pricing — Secure signing for every scale",
		description:
			"Filosign plans from free to enterprise: encrypted signing, proof exports, and optional USDC settlements.",
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
	security: {
		title: "Security — Filosign",
		description:
			"How Filosign approaches private document workflows, client-side encryption, and signing proof.",
	},
	subprocessors: {
		title: "Subprocessors — Filosign",
		description: "Service providers used to operate Filosign.",
	},
	"acceptable-use": {
		title: "Acceptable Use — Filosign",
		description: "Acceptable use rules for Filosign.",
	},
	"legal-e-signature-validity": {
		title: "E-signature Validity — Filosign",
		description:
			"How Filosign thinks about electronic-signature evidence and legal suitability.",
	},
	"legal-non-custodial-settlement": {
		title: "Non-custodial Settlement — Filosign",
		description: "How optional USDC settlement works in Filosign.",
	},
	"blog-introduction": {
		title: "Introducing Filosign — Filosign Blog",
		description:
			"Introducing Filosign: private agreement workflows with encrypted documents, proof packets, and optional USDC settlement.",
	},
	"blog-future-of-digital-agreements": {
		title:
			"The future of digital agreements: Why we built Filosign — Filosign Blog",
		description:
			"Why agreements should be private, verifiable, and able to connect to real workflow outcomes.",
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
			"Placement manifests, proof bundles, and signing records for independently verifiable e-signature evidence.",
	},
	"blog-milestone-payments-non-custodial-settlement": {
		title:
			"Connecting Agreements to Actions: Our Journey to Programmable Payouts — Filosign Blog",
		description:
			"How winning the Filecoin Alpha Cohort and showcasing at Devconnect Buenos Aires pushed us to bridge the gap between signed agreements and blockchain payments.",
	},
} as const;

export type MarketingOgSlug = keyof typeof MARKETING_OG_PAGES;
