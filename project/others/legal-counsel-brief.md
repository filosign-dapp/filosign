# Counsel briefing packet - Filosign legal pages

**Not legal advice.** Use this memo to brief qualified counsel before paid production launch.

**Marketing site:** [https://filosign.xyz/](https://filosign.xyz/)  
**Web application:** [https://app.filosign.xyz/](https://app.filosign.xyz/)

## Operator posture

- **No registered entity yet.** Service operated by **Kartikay Tiwari**, individual, **Jaunpur, India**, doing business as **Filosign**.
- **Subscriptions:** **Dodo Payments, Inc.** as **Merchant of Record** (legal seller on subscription charges), not payment-gateway-only.
- **Product:** Encrypted document signing; optional non-custodial USDC settlement on Base (v1); no fund custody.

## Documents to review (public URLs)

| Document | Link |
|----------|------|
| Terms of Service | [https://filosign.xyz/terms/](https://filosign.xyz/terms/) |
| Privacy Policy | [https://filosign.xyz/privacy/](https://filosign.xyz/privacy/) |
| Acceptable Use | [https://filosign.xyz/acceptable-use/](https://filosign.xyz/acceptable-use/) |
| Subprocessors | [https://filosign.xyz/subprocessors/](https://filosign.xyz/subprocessors/) |
| E-signature validity (explainer) | [https://filosign.xyz/legal/e-signature-validity/](https://filosign.xyz/legal/e-signature-validity/) |
| Non-custodial settlement (explainer) | [https://filosign.xyz/legal/non-custodial-settlement/](https://filosign.xyz/legal/non-custodial-settlement/) |
| Security overview | [https://filosign.xyz/security/](https://filosign.xyz/security/) |
| Pricing (subscription context) | [https://filosign.xyz/pricing/](https://filosign.xyz/pricing/) |

**Contact (as stated on-site):** [support@filosign.xyz](mailto:support@filosign.xyz) · [privacy@filosign.xyz](mailto:privacy@filosign.xyz) · [security@filosign.xyz](mailto:security@filosign.xyz)

## Priority questions for counsel

1. **Sole proprietor vs incorporation** before paid GA; liability and Dodo merchant KYC.
2. **India:** DPDP significant fiduciary threshold, grievance officer duties, notice content, Jaunpur venue/arbitration.
3. **GDPR/UK:** Whether EU/UK representative required; transfer mechanisms (SCCs/IDTA); completeness of rights and legal bases.
4. **Dodo MoR split:** Confirm dual-controller disclosure (Filosign app data vs Dodo checkout/payment data) and customer-facing refund/chargeback allocation.
5. **ToS enforceability:** Liability cap, indemnity, B2C users in EU/UK, arbitration clause.
6. **E-sign claims:** Excluded-document lists and marketing alignment (no ESIGN/eIDAS “satisfaction” claims on [blog](https://filosign.xyz/blog/) and product copy).
7. **Settlement / MSB:** Non-custodial USDC relay posture and sanctions/export controls language.

## Copy themes already on the site (still need counsel sign-off)

- Merchant of Record section in [Privacy Policy](https://filosign.xyz/privacy/); MoR-only billing language in [Terms](https://filosign.xyz/terms/).
- Footer links to [Acceptable Use](https://filosign.xyz/acceptable-use/) and [Subprocessors](https://filosign.xyz/subprocessors/).
- [Subprocessors](https://filosign.xyz/subprocessors/) lists **Resend**, **Hetzner (app + Postgres)**, **Cloudflare R2**, thirdweb, PostHog, Dodo MoR.
- [Security overview](https://filosign.xyz/security/) in present tense; unaudited smart-contract notice for settlement.
- Shared excluded-document list across Terms, e-sign explainer, and Acceptable Use.

## In-product behavior to verify against policies

- **E-sign consent** - shown on the document signing screen in the web app ([app.filosign.xyz](https://app.filosign.xyz/)).
- **Analytics consent** - non-essential analytics gated behind consent in the web app; should match [Privacy Policy](https://filosign.xyz/privacy/) §10.
- **Subscription checkout** - processed by Dodo as MoR; confirm checkout/disclosure flow matches [Terms §8](https://filosign.xyz/terms/) and [Dodo’s privacy policy](https://dodopayments.com/legal/privacy-policy).

## Dodo references

- MoR overview: [https://docs.dodopayments.com/features/mor-vs-pg](https://docs.dodopayments.com/features/mor-vs-pg)
- Dodo privacy policy: [https://dodopayments.com/legal/privacy-policy](https://dodopayments.com/legal/privacy-policy)
- Dodo DPA: [https://dodopayments.com/legal/data-processing-agreement](https://dodopayments.com/legal/data-processing-agreement)
