/** Shared legal copy for Astro policy pages - keep in sync across Terms, Privacy, and explainers. */

export const LEGAL_OPERATOR = {
	legalName: "Kartikay Tiwari",
	tradingName: "Filosign",
	location: "Jaunpur, India",
	supportEmail: "support@filosign.xyz",
	privacyEmail: "privacy@filosign.xyz",
	securityEmail: "security@filosign.xyz",
} as const;

/** Privacy Policy operator disclosure only — do not use on other public pages. */
export function operatorIdentitySentence(): string {
	return `${LEGAL_OPERATOR.legalName}, an individual residing in ${LEGAL_OPERATOR.location}, doing business as ${LEGAL_OPERATOR.tradingName}`;
}

export const DODO_PAYMENTS = {
	name: "Dodo Payments, Inc.",
	privacyPolicyUrl: "https://dodopayments.com/legal/privacy-policy",
} as const;

/** Illustrative high-risk / excluded document categories (non-exhaustive). */
export const EXCLUDED_DOCUMENT_CATEGORIES = [
	"wills, trusts, codicils, or other estate and testamentary documents",
	"powers of attorney (except where explicitly permitted under applicable law for regulated financial entities)",
	"negotiable instruments, promissory notes, or bills of exchange (except where explicitly permitted for regulated financial entities)",
	"divorce, adoption, family-law, or court-related filings (including summonses, briefs, or court orders)",
	"government notices, official filings, or court orders",
	"real-estate transfers, deeds, or documents requiring public recordation",
	"cancellation or termination of utility services (e.g., water, heat, power) or health/life insurance benefits",
	"notices of default, foreclosure, repossession, eviction, or acceleration under agreements secured by a primary residence",
	"product safety recall notices or documents required to accompany hazardous materials transportation",
	"regulated financial, securities, healthcare, employment, or consumer documents with special legal requirements",
] as const;

export const EXCLUDED_DOCUMENTS_INTRO_TERMS = `Do not rely on Filosign for documents that require notarization,
					witnessing, wet-ink signatures, qualified electronic signatures, or
					special statutory formalities unless your counsel confirms the
					workflow is suitable. The following non-exhaustive list illustrates document types that may require formalities Filosign does not support or that may be unsuitable for your workflow:`;

export const EXCLUDED_DOCUMENTS_INTRO_ESIGN = `Certain documents may require wet-ink, notarization, witnessing, qualified electronic signatures, or other formalities Filosign does not provide. The following non-exhaustive list illustrates examples. Always confirm suitability with qualified counsel:`;
