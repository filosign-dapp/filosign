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
		title: "About Filosign — Signing you can trust after the ink dries",
		description:
			"Why Filosign exists: private agreements, records you can verify anywhere, and attached payouts.",
	},
	pricing: {
		title: "Pricing — Encrypted signing with proof you can verify",
		description:
			"Free, Solo, Teams ($35), and Teams Pro ($59). Pooled team quotas, encrypted signing, proof exports, and attached payouts.",
	},
	changelog: {
		title: "Changelog — What's new at Filosign",
		description:
			"How Filosign grew—sign-in and encrypted uploads first, then proof, teams, payouts, and drafts on top.",
	},
	blog: {
		title: "Blog — News and updates from Filosign",
		description:
			"Engineering and product notes from Filosign: E2EE signing, placement manifests, wallet unlock, and decentralized agreement infrastructure.",
	},
	privacy: {
		title: "Privacy Policy — Filosign",
		description:
			"How Filosign handles personal data for document signing, wallet authentication, and attached payout features.",
	},
	terms: {
		title: "Terms of Service — Filosign",
		description:
			"Terms of Service for Filosign document signing software and on-chain attached payout automation.",
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
		description: "How attached payouts work in Filosign.",
	},
	"blog-introduction": {
		title: "Introducing Filosign — Filosign Blog",
		description:
			"Private agreement workflows with E2EE documents, FSFileRegistry proof on Base, proof packets, and attached payouts.",
	},
	"blog-future-of-digital-agreements": {
		title:
			"The future of digital agreements: Why we built Filosign — Filosign Blog",
		description:
			"Platform risk in centralized e-sign, and how Filosign combines client-side encryption, on-chain attestations, and attached payouts.",
	},
	"blog-unlocking-filosign-after-privy": {
		title:
			"What OAuth can't unwrap: wallet-derived unlock for Filosign's client keys — Filosign Blog",
		description:
			"Why social login and PQ signing keys differ, how keygen commitments live off-chain, and how wallet-derived unlock reuses registration math.",
	},
	"blog-placement-based-signing-infrastructure": {
		title:
			"Inside Filosign's Signing Flow: Infrastructure Built for Legal Certainty — Filosign Blog",
		description:
			"Placement manifests, Merkle proofs, compliance bundles, and FSFileRegistry attestations for independently verifiable signing evidence.",
	},
	"blog-milestone-payments-non-custodial-settlement": {
		title:
			"Connecting Agreements to Actions: Our Journey to Programmable Payouts — Filosign Blog",
		description:
			"How winning the Filecoin Alpha Cohort and showcasing at Devconnect Buenos Aires pushed us to bridge the gap between signed agreements and blockchain payments.",
	},
} as const;

export type MarketingOgSlug = keyof typeof MARKETING_OG_PAGES;
