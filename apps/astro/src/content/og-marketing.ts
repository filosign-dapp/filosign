import { defaultDescription, defaultTitle } from "../config/site";

/**
 * Open Graph card copy - keep in sync with each page's `<BaseLayout title/description>`.
 * Keys map to URL → {@link ../lib/og-slug.ts ogSlugFromPathname}.
 */
export const MARKETING_OG_PAGES = {
	index: {
		title: defaultTitle,
		description: defaultDescription,
	},
	about: {
		title: "About Filosign - Agreements that unlock the next step",
		description:
			"Why Filosign exists: private agreement workflows with signatures, proof, gated files, and payout packets.",
	},
	pricing: {
		title: "Pricing - Private agreement workflows",
		description:
			"Pricing for private documents, proof exports, gated files, and payout packets. Enterprise plans by request.",
	},
	changelog: {
		title: "Changelog - What's new at Filosign",
		description:
			"How Filosign grew from private signing into agreement workflows with proof, teams, gated files, payout packets, and drafts.",
	},
	blog: {
		title: "Blog - News and updates from Filosign",
		description:
			"Product and engineering notes on private agreement workflows, proof, gated files, and payout packets.",
	},
	privacy: {
		title: "Privacy Policy - Filosign",
		description:
			"How Filosign handles personal data for document signing, wallet authentication, and payout packet features.",
	},
	terms: {
		title: "Terms of Service - Filosign",
		description:
			"Terms of Service for Filosign document signing software and on-chain attached payout automation.",
	},
	security: {
		title: "Security - Filosign",
		description:
			"How Filosign approaches private document workflows, client-side encryption, and signing proof.",
	},
	subprocessors: {
		title: "Subprocessors - Filosign",
		description: "Service providers used to operate Filosign.",
	},
	"acceptable-use": {
		title: "Acceptable Use - Filosign",
		description: "Acceptable use rules for Filosign.",
	},
	"legal-e-signature-validity": {
		title: "E-signature Validity - Filosign",
		description:
			"How Filosign thinks about electronic-signature evidence and legal suitability.",
	},
	"legal-non-custodial-settlement": {
		title: "Payout attachment - Filosign",
		description:
			"Optional USDC payout instructions on documents. Non-custodial: funds stay in your wallet until on-chain conditions are met.",
	},
	"legal-settlement-feature-addendum": {
		title: "Payout attachment addendum - Filosign",
		description:
			"Workspace terms for optional programmatic payout attachment on Filosign.",
	},
	"blog-introduction": {
		title: "Introducing Filosign - Filosign Blog",
		description:
			"Private agreement workflows with encrypted documents, proof packets, gated files, and payout packets.",
	},
	"blog-future-of-digital-agreements": {
		title:
			"The future of digital agreements: Why we built Filosign - Filosign Blog",
		description:
			"Why agreements should stay private, create proof, and unlock the next business step.",
	},
	"blog-unlocking-filosign-after-privy": {
		title:
			"What OAuth can't unwrap: wallet-derived unlock for Filosign's client keys - Filosign Blog",
		description:
			"Why social login and PQ signing keys differ, how keygen commitments live off-chain, and how wallet-derived unlock reuses registration math.",
	},
	"blog-placement-based-signing-infrastructure": {
		title:
			"Inside Filosign's Signing Flow: Infrastructure Built for Legal Certainty - Filosign Blog",
		description:
			"Placement manifests, Merkle proofs, compliance bundles, and FSEnvelopeRegistry attestations for independently verifiable signing evidence.",
	},
	"blog-milestone-payments-non-custodial-settlement": {
		title:
			"Connecting Agreements to Actions: Our Journey to Programmable Payouts - Filosign Blog",
		description:
			"How the Filecoin Alpha Cohort pushed Filosign toward workflows where signed agreements can trigger payout follow-up.",
	},
} as const;

export type MarketingOgSlug = keyof typeof MARKETING_OG_PAGES;
