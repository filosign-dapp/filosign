
Implemented the marketing-site repositioning.

What changed:
- Rewrote homepage hero around private agreement workflows + optional USDC settlement.
- Added landing sections for workflow, use cases, ecosystem validation, proof packets, and non-custodial settlement.
- Removed GitHub/source-code/open-source CTAs from the public marketing surface.
- Softened risky claims around eIDAS, legality, permanent storage, “court anywhere,” and settlement.
- Updated pricing/about/metadata/changelog copy to match the new narrative.
- Rewrote stale launch/strategy blog posts and added 6 product-story blog posts.
- Expanded Terms and Privacy.
- Added new trust/legal pages:
  - `/security`
  - `/subprocessors`
  - `/acceptable-use`
  - `/legal/e-signature-validity`
  - `/legal/non-custodial-settlement`

Verification:
- `bun run --cwd apps/astro build` passes.
- Risky-claim audit returned no matches for open source/GitHub, legally binding, eIDAS compliance, storage forever, USDT, etc.
- Build has existing font resolution warnings, but no route/MDX/build failures.

Note: `git status` shows unrelated modified contract definition files that I did not touch: `apps/contracts/definitions/local.ts` and `apps/contracts/definitions/mock-usdc.ts`.

> Can you audit and compare the trust and legal pages, important terms, and privacy policy statements to industry standard giants like DocuSign, Documents, etc., and other web3 platforms that might be similar to us, and draft a plan to make sure they are drafted as correctly as they can be and that we did not miss anything

<details><summary>4 previous messages</summary>

> I’ll audit our current legal/trust pages against the local implementation first, then compare against current public terms/privacy/trust pages from major e-sign and Web3 platforms. Because legal pages change over time, I’ll verify from live sources and keep this as a product/legal drafting plan, not legal advice.
>
> <details><summary>Explored 2 files, 1 search, ran 1 command, searched web 5 times</summary>
>
> <details><summary>Explored 2 files, 1 search</summary>
>
> - Searched for `terms.astro` in `pages`
> - Read `./apps/astro/src/pages/privacy.astro`
> - Read `./apps/astro/src/pages/terms.astro`
>
> </details>
>
> - Ran `for f in apps/astro/src/pages/security.astro apps/astro/src/pages/subprocessors.astro apps/astro/src/pages/acceptable-use.astro apps/astro/src/pages/legal/e-signature-validity.astro apps/astro/src/pages/legal/non-custodial-settlement.astro; do echo '---' $f; sed -n '1,220p' "$f"; done`
>
> <details><summary>Searched web 5 times</summary>
>
> - Searched web for `DocuSign terms of use privacy policy security legal electronic signature validity`
> - Searched web for `Request Finance terms of service privacy policy crypto payments non custodial`
> - Searched web for `https://www.docusign.com/legal/terms-and-conditions`
> - Searched web for `'Customer Responsibilities' in https://www.docusign.com/legal/terms-and-conditions`
> - Searched web for `'Retention' in https://www.docusign.com/company/privacy-policy`
>
> </details>
>
> </details>
>
> Plan
>
> # Legal, Trust, Terms & Privacy Upgrade Plan
>
> ## Summary
> Filosign’s current legal/trust pages are a useful MVP, but they are much thinner than mature e-signature and Web3 payment platforms. DocuSign and Dropbox Sign separate terms, privacy, security, e-signature legality, audit trails, data retention, regional privacy rights, and customer responsibility. Web3/payment platforms like Request Finance and Bridge add non-custody/payment disclaimers, jurisdiction-specific terms, partner terms, transaction risk, and compliance language.
>
> Important: this plan produces counsel-ready product/legal drafts, not final legal advice. A lawyer should review before paid/mainnet launch.
>
> Reference patterns:
> - [DocuSign Terms](https://www.docusign.com/legal/terms-and-conditions), [DocuSign Privacy](https://www.docusign.com/company/privacy-policy)
> - [Dropbox Sign Privacy](https://sign.dropbox.com/about/privacy), [Dropbox Sign legality explainer](https://help.dropbox.com/security/is-dropbox-sign-legally-binding)
> - [Request Finance Terms](https://support.request.finance/legal/terms-and-conditions)
> - [Bridge legal overview](https://www.bridge.xyz/legal/overview), [Bridge privacy](https://www.bridge.xyz/legal/row-privacy-policy/bridge-building-limited)
>
> ## Key Findings
> - **Terms gap:** current terms miss several standard SaaS clauses: subscription/payment terms, refunds, termination, suspension, IP ownership, user content license, indemnity, governing law, dispute resolution, changes to terms, third-party services, sanctions/export controls, taxes, and organization/admin controls.
> - **Privacy gap:** current privacy page lacks controller/processor framing, legal bases, detailed recipients, retention periods, children/minors, cookie choices, regional privacy rights, DSR request process, breach/security language, and a real subprocessor register.
> - **E-signature gap:** current validity page correctly avoids overclaiming, but should explain e-sign evidence requirements more completely: intent, consent, attribution, association with record, retention, audit trail, consumer disclosures, excluded document categories, and jurisdiction limits.
> - **Web3/payment gap:** settlement language is directionally good, but should add stablecoin/smart-contract risk, token approval risk, wallet compromise, direct contract use, taxes/accounting, sanctions screening limits, no fiat/on-ramp claims, and no regulated payment-service claim.
> - **Trust gap:** security page is too thin for serious B2B buyers. It needs encryption/key model, what Filosign can/cannot see, admin access, incident reporting, vulnerability disclosure, backup/availability posture, smart-contract status, audit status, and data-flow diagrams later.
>
> ## Page-Level Changes
>
> ### 1. Terms of Service
> Replace the current thin ToS with a production-style SaaS + Web3 terms structure.
>
> Include:
> - acceptance and authority to bind an organization
> - account registration, admin roles, workspace responsibility, unauthorized access notice
> - beta/testnet disclaimer and production/mainnet distinction
> - user content ownership plus limited license for Filosign to operate the service
> - document responsibility and no legal advice
> - e-signature consent and electronic communications consent
> - non-custodial USDC settlement terms
> - direct contract use vs supported product path
> - wallet, private key, approval, and smart-contract risk
> - stablecoin/token risk, network risk, chain fork/reorg risk
> - sanctions, export controls, prohibited jurisdictions, prohibited transactions
> - taxes/accounting responsibility for payments
> - third-party services and partner terms
> - subscription/payment/refund/renewal terms, even if “not yet applicable”
> - suspension and termination rights
> - IP ownership and feedback license
> - confidentiality if applicable for business customers
> - disclaimers, warranty exclusions, indemnity, liability cap
> - governing law / venue placeholder for counsel
> - changes to terms
> - contact and legal notice method
>
> Default stance:
> - B2B-first, not consumer-first.
> - State Filosign does not provide legal, tax, financial, or payment-service advice.
> - State Filosign does not custody funds or guarantee settlement execution.
>
> ### 2. Privacy Policy
> Expand privacy into a proper data-practice document.
>
> Include:
> - who operates Filosign and contact email
> - data controller vs processor explanation:
>   - Filosign as controller for account, billing, analytics, security
>   - Filosign as processor/service provider for customer document workflow data where applicable
> - data categories:
>   - account/profile
>   - wallet/on-chain identifiers
>   - document metadata
>   - encrypted content
>   - participants/recipients
>   - signature/proof records
>   - settlement metadata
>   - usage/device/logs
>   - support/communications
>   - billing/payment processor data
> - purposes and lawful bases:
>   - contract, legitimate interest, consent, legal obligation
> - sharing/recipients:
>   - service providers, subprocessors, payment processors, wallet/auth providers, analytics, legal/security, business transfer, parties to transaction
> - retention:
>   - account data
>   - document metadata
>   - encrypted files
>   - proof/export logs
>   - logs/security records
>   - on-chain records cannot be deleted by Filosign
> - user rights:
>   - access, correction, deletion, export, objection, restriction, opt-out
> - regional notices:
>   - GDPR/EEA/UK
>   - India DPDP
>   - California/US state privacy, if targeting US users
> - cookies/analytics and consent
> - children/minors
> - international transfers
> - security measures
> - breach/contact process
> - AI/model-training statement:
>   - default: no training on customer document contents without explicit consent
>
> ### 3. E-Signature Validity Page
> Turn `/legal/e-signature-validity` into a buyer-facing evidence explainer.
>
> Include:
> - clear disclaimer: not legal advice; not all documents are eligible
> - concepts used by ESIGN/UETA-style frameworks:
>   - signer intent
>   - consent to transact electronically
>   - attribution/authentication
>   - association of signature with record
>   - record retention and access
>   - audit/proof trail
> - what Filosign records:
>   - signer identity/wallet/email commitments where applicable
>   - timestamps
>   - completed fields
>   - document/proof identifiers
>   - transaction hashes when applicable
> - limitations:
>   - not currently QES
>   - not legal advice
>   - some document categories may require special handling or wet signatures
>   - users should confirm suitability with counsel
> - link to ToS and proof packet explanation
>
> ### 4. Non-Custodial Settlement Page
> Make `/legal/non-custodial-settlement` more precise and protective.
>
> Include:
> - plain-language flow:
>   - sender creates document
>   - sender registers rule
>   - sender approves exact token amount
>   - signer completes conditions
>   - payout may execute
> - who controls funds:
>   - payer wallet retains funds until execution
>   - Filosign does not custody, pool, or transmit funds
> - what Filosign may do:
>   - verify supported-path rules
>   - index status
>   - relay transactions
>   - include records in proof packet
> - what Filosign does not do:
>   - guarantee payout
>   - screen all direct contract transactions
>   - reverse blockchain transfers
>   - provide fiat on/off-ramp
>   - provide tax/accounting advice
> - risks:
>   - wrong recipient
>   - token approval risk
>   - insufficient balance
>   - revoked approval
>   - wallet compromise
>   - smart-contract/network risk
>   - sanctions/compliance risk
>   - public on-chain metadata
>
> ### 5. Security Page
> Expand `/security` into a trust center starter.
>
> Include:
> - high-level architecture:
>   - browser encryption
>   - encrypted storage
>   - wallet/session/auth
>   - proof records
>   - optional on-chain settlement
> - what Filosign can see vs cannot see
> - key-management model and recovery caveats
> - admin access policy placeholder
> - incident response contact
> - vulnerability disclosure process
> - smart-contract status:
>   - deployed networks
>   - audit status
>   - immutable/proxy posture if relevant
> - infrastructure and backup posture
> - planned security roadmap:
>   - external audit
>   - SOC 2 later
>   - security contact email
>   - status page
>
> ### 6. Subprocessors Page
> Replace placeholder with a real table before launch.
>
> Table columns:
> - Vendor
> - Purpose
> - Data categories
> - Region / hosting location if known
> - Privacy/security link
> - DPA/subprocessor note
>
> Likely categories:
> - hosting
> - database
> - object storage
> - email
> - analytics
> - authentication/wallet
> - blockchain RPC
> - payment processor
> - error monitoring
> - support/contact tooling
>
> Default:
> - If vendor list is not final, mark page “Pre-production register” and do not imply completeness.
>
> ### 7. Acceptable Use Policy
> Expand beyond the short list.
>
> Include:
> - illegal content and transactions
> - fraud, phishing, impersonation
> - malware, spam, harassment
> - sanctions/export-control violations
> - financial crime, money laundering, terrorism financing
> - unauthorized sharing of personal/confidential data
> - abusive automation/scraping
> - attempts to bypass usage limits or security controls
> - settlement abuse and suspicious payout behavior
> - enforcement: suspend, remove, block, report, preserve evidence
>
> ## Implementation Changes
> - Update existing Astro pages:
>   - `apps/astro/src/pages/terms.astro`
>   - `apps/astro/src/pages/privacy.astro`
>   - `apps/astro/src/pages/security.astro`
>   - `apps/astro/src/pages/subprocessors.astro`
>   - `apps/astro/src/pages/acceptable-use.astro`
>   - `apps/astro/src/pages/legal/e-signature-validity.astro`
>   - `apps/astro/src/pages/legal/non-custodial-settlement.astro`
> - Add a new internal source doc:
>   - `project/legal/legal-readiness-checklist.md`
> - Add footer links to all legal/trust pages if not already present.
> - Keep copy plain-English, but structure it like mature SaaS legal pages.
> - Add visible “Last updated” dates.
> - Add counsel-review notes in `project/legal/legal-readiness-checklist.md`, not public pages.
>
> ## Test Plan
> - Run Astro build.
> - Search for risky overclaims:
>   - `legally binding anywhere`
>   - `QES-compliant`
>   - `guaranteed`
>   - `custody`
>   - `escrow`
>   - `money transmitter`
>   - `permanent forever`
>   - `legal advice`
> - Verify every legal/trust page is linked from footer or relevant page.
> - Verify terms/privacy metadata and OG entries exist.
> - Manual review with a checklist:
>   - e-signature posture is cautious
>   - settlement posture is non-custodial
>   - privacy rights are not overpromised
>   - no final legal venue/entity is invented if company is not formed
>   - all “production” language distinguishes beta/testnet where needed
>
> ## Assumptions
> - Filosign is currently pre-entity or early entity formation, so governing law, legal entity name, registered address, and formal notice email remain placeholders for counsel.
> - Filosign does not provide fiat on/off-ramp, custody, money transmission, tax filing, payroll, or legal advice today.
> - The product is B2B-first, but public access may include individuals, so terms should avoid ignoring consumer/privacy rights entirely.
> - Final production launch requires lawyer review, especially for e-signature validity, sanctions/payment language, limitation of liability, and privacy regional notices.
>
> Plan implementation
>
> Status: completed
> # Legal, Trust, Terms & Privacy Upgrade Plan
>
> ## Summary
> Filosign’s current legal/trust pages are a useful MVP, but they are much thinner than mature e-signature and Web3 payment platforms. DocuSign and Dropbox Sign separate terms, privacy, security, e-signature legality, audit trails, data retention, regional privacy rights, and customer responsibility. Web3/payment platforms like Request Finance and Bridge add non-custody/payment disclaimers, jurisdiction-specific terms, partner terms, transaction risk, and compliance language.
>
> Important: this plan produces counsel-ready product/legal drafts, not final legal advice. A lawyer should review before paid/mainnet launch.
>
> Reference patterns:
> - [DocuSign Terms](https://www.docusign.com/legal/terms-and-conditions), [DocuSign Privacy](https://www.docusign.com/company/privacy-policy)
> - [Dropbox Sign Privacy](https://sign.dropbox.com/about/privacy), [Dropbox Sign legality explainer](https://help.dropbox.com/security/is-dropbox-sign-legally-binding)
> - [Request Finance Terms](https://support.request.finance/legal/terms-and-conditions)
> - [Bridge legal overview](https://www.bridge.xyz/legal/overview), [Bridge privacy](https://www.bridge.xyz/legal/row-privacy-policy/bridge-building-limited)
>
> ## Key Findings
> - **Terms gap:** current terms miss several standard SaaS clauses: subscription/payment terms, refunds, termination, suspension, IP ownership, user content license, indemnity, governing law, dispute resolution, changes to terms, third-party services, sanctions/export controls, taxes, and organization/admin controls.
> - **Privacy gap:** current privacy page lacks controller/processor framing, legal bases, detailed recipients, retention periods, children/minors, cookie choices, regional privacy rights, DSR request process, breach/security language, and a real subprocessor register.
> - **E-signature gap:** current validity page correctly avoids overclaiming, but should explain e-sign evidence requirements more completely: intent, consent, attribution, association with record, retention, audit trail, consumer disclosures, excluded document categories, and jurisdiction limits.
> - **Web3/payment gap:** settlement language is directionally good, but should add stablecoin/smart-contract risk, token approval risk, wallet compromise, direct contract use, taxes/accounting, sanctions screening limits, no fiat/on-ramp claims, and no regulated payment-service claim.
> - **Trust gap:** security page is too thin for serious B2B buyers. It needs encryption/key model, what Filosign can/cannot see, admin access, incident reporting, vulnerability disclosure, backup/availability posture, smart-contract status, audit status, and data-flow diagrams later.
>
> ## Page-Level Changes
>
> ### 1. Terms of Service
> Replace the current thin ToS with a production-style SaaS + Web3 terms structure.
>
> Include:
> - acceptance and authority to bind an organization
> - account registration, admin roles, workspace responsibility, unauthorized access notice
> - beta/testnet disclaimer and production/mainnet distinction
> - user content ownership plus limited license for Filosign to operate the service
> - document responsibility and no legal advice
> - e-signature consent and electronic communications consent
> - non-custodial USDC settlement terms
> - direct contract use vs supported product path
> - wallet, private key, approval, and smart-contract risk
> - stablecoin/token risk, network risk, chain fork/reorg risk
> - sanctions, export controls, prohibited jurisdictions, prohibited transactions
> - taxes/accounting responsibility for payments
> - third-party services and partner terms
> - subscription/payment/refund/renewal terms, even if “not yet applicable”
> - suspension and termination rights
> - IP ownership and feedback license
> - confidentiality if applicable for business customers
> - disclaimers, warranty exclusions, indemnity, liability cap
> - governing law / venue placeholder for counsel
> - changes to terms
> - contact and legal notice method
>
> Default stance:
> - B2B-first, not consumer-first.
> - State Filosign does not provide legal, tax, financial, or payment-service advice.
> - State Filosign does not custody funds or guarantee settlement execution.
>
> ### 2. Privacy Policy
> Expand privacy into a proper data-practice document.
>
> Include:
> - who operates Filosign and contact email
> - data controller vs processor explanation:
>   - Filosign as controller for account, billing, analytics, security
>   - Filosign as processor/service provider for customer document workflow data where applicable
> - data categories:
>   - account/profile
>   - wallet/on-chain identifiers
>   - document metadata
>   - encrypted content
>   - participants/recipients
>   - signature/proof records
>   - settlement metadata
>   - usage/device/logs
>   - support/communications
>   - billing/payment processor data
> - purposes and lawful bases:
>   - contract, legitimate interest, consent, legal obligation
> - sharing/recipients:
>   - service providers, subprocessors, payment processors, wallet/auth providers, analytics, legal/security, business transfer, parties to transaction
> - retention:
>   - account data
>   - document metadata
>   - encrypted files
>   - proof/export logs
>   - logs/security records
>   - on-chain records cannot be deleted by Filosign
> - user rights:
>   - access, correction, deletion, export, objection, restriction, opt-out
> - regional notices:
>   - GDPR/EEA/UK
>   - India DPDP
>   - California/US state privacy, if targeting US users
> - cookies/analytics and consent
> - children/minors
> - international transfers
> - security measures
> - breach/contact process
> - AI/model-training statement:
>   - default: no training on customer document contents without explicit consent
>
> ### 3. E-Signature Validity Page
> Turn `/legal/e-signature-validity` into a buyer-facing evidence explainer.
>
> Include:
> - clear disclaimer: not legal advice; not all documents are eligible
> - concepts used by ESIGN/UETA-style frameworks:
>   - signer intent
>   - consent to transact electronically
>   - attribution/authentication
>   - association of signature with record
>   - record retention and access
>   - audit/proof trail
> - what Filosign records:
>   - signer identity/wallet/email commitments where applicable
>   - timestamps
>   - completed fields
>   - document/proof identifiers
>   - transaction hashes when applicable
> - limitations:
>   - not currently QES
>   - not legal advice
>   - some document categories may require special handling or wet signatures
>   - users should confirm suitability with counsel
> - link to ToS and proof packet explanation
>
> ### 4. Non-Custodial Settlement Page
> Make `/legal/non-custodial-settlement` more precise and protective.
>
> Include:
> - plain-language flow:
>   - sender creates document
>   - sender registers rule
>   - sender approves exact token amount
>   - signer completes conditions
>   - payout may execute
> - who controls funds:
>   - payer wallet retains funds until execution
>   - Filosign does not custody, pool, or transmit funds
> - what Filosign may do:
>   - verify supported-path rules
>   - index status
>   - relay transactions
>   - include records in proof packet
> - what Filosign does not do:
>   - guarantee payout
>   - screen all direct contract transactions
>   - reverse blockchain transfers
>   - provide fiat on/off-ramp
>   - provide tax/accounting advice
> - risks:
>   - wrong recipient
>   - token approval risk
>   - insufficient balance
>   - revoked approval
>   - wallet compromise
>   - smart-contract/network risk
>   - sanctions/compliance risk
>   - public on-chain metadata
>
> ### 5. Security Page
> Expand `/security` into a trust center starter.
>
> Include:
> - high-level architecture:
>   - browser encryption
>   - encrypted storage
>   - wallet/session/auth
>   - proof records
>   - optional on-chain settlement
> - what Filosign can see vs cannot see
> - key-management model and recovery caveats
> - admin access policy placeholder
> - incident response contact
> - vulnerability disclosure process
> - smart-contract status:
>   - deployed networks
>   - audit status
>   - immutable/proxy posture if relevant
> - infrastructure and backup posture
> - planned security roadmap:
>   - external audit
>   - SOC 2 later
>   - security contact email
>   - status page
>
> ### 6. Subprocessors Page
> Replace placeholder with a real table before launch.
>
> Table columns:
> - Vendor
> - Purpose
> - Data categories
> - Region / hosting location if known
> - Privacy/security link
> - DPA/subprocessor note
>
> Likely categories:
> - hosting
> - database
> - object storage
> - email
> - analytics
> - authentication/wallet
> - blockchain RPC
> - payment processor
> - error monitoring
> - support/contact tooling
>
> Default:
> - If vendor list is not final, mark page “Pre-production register” and do not imply completeness.
>
> ### 7. Acceptable Use Policy
> Expand beyond the short list.
>
> Include:
> - illegal content and transactions
> - fraud, phishing, impersonation
> - malware, spam, harassment
> - sanctions/export-control violations
> - financial crime, money laundering, terrorism financing
> - unauthorized sharing of personal/confidential data
> - abusive automation/scraping
> - attempts to bypass usage limits or security controls
> - settlement abuse and suspicious payout behavior
> - enforcement: suspend, remove, block, report, preserve evidence
>
> ## Implementation Changes
> - Update existing Astro pages:
>   - `apps/astro/src/pages/terms.astro`
>   - `apps/astro/src/pages/privacy.astro`
>   - `apps/astro/src/pages/security.astro`
>   - `apps/astro/src/pages/subprocessors.astro`
>   - `apps/astro/src/pages/acceptable-use.astro`
>   - `apps/astro/src/pages/legal/e-signature-validity.astro`
>   - `apps/astro/src/pages/legal/non-custodial-settlement.astro`
> - Add a new internal source doc:
>   - `project/legal/legal-readiness-checklist.md`
> - Add footer links to all legal/trust pages if not already present.
> - Keep copy plain-English, but structure it like mature SaaS legal pages.
> - Add visible “Last updated” dates.
> - Add counsel-review notes in `project/legal/legal-readiness-checklist.md`, not public pages.
>
> ## Test Plan
> - Run Astro build.
> - Search for risky overclaims:
>   - `legally binding anywhere`
>   - `QES-compliant`
>   - `guaranteed`
>   - `custody`
>   - `escrow`
>   - `money transmitter`
>   - `permanent forever`
>   - `legal advice`
> - Verify every legal/trust page is linked from footer or relevant page.
> - Verify terms/privacy metadata and OG entries exist.
> - Manual review with a checklist:
>   - e-signature posture is cautious
>   - settlement posture is non-custodial
>   - privacy rights are not overpromised
>   - no final legal venue/entity is invented if company is not formed
>   - all “production” language distinguishes beta/testnet where needed
>
> ## Assumptions
> - Filosign is currently pre-entity or early entity formation, so governing law, legal entity name, registered address, and formal notice email remain placeholders for counsel.
> - Filosign does not provide fiat on/off-ramp, custody, money transmission, tax filing, payroll, or legal advice today.
> - The product is B2B-first, but public access may include individuals, so terms should avoid ignoring consumer/privacy rights entirely.
> - Final production launch requires lawyer review, especially for e-signature validity, sanctions/payment language, limitation of liability, and privacy regional notices.
</details>

> grill me and ask questions that you need to correctly draft these. i can provide you details on infra, deployments and other info if that you cant access from codebase?

<details><summary>5 previous messages</summary>

> Context compaction
>
> Source: automatic
> Status: completed
>
> I’ll ground this in the actual legal/trust pages and deployment shape first, then I’ll ask only the questions that materially affect the draft. I’m looking for facts the repo can answer so I don’t waste your time.
>
> <details><summary>Explored 1 file, 2 searches, 1 list</summary>
>
> - Read `./apps/server/config.ts`
> - Listed files in `pages`
> - Searched for `(terms|privacy|security|subprocessors|acceptable|legal|settlement|config|deploy|env|runtime|storage|auth|email|analytics)`
> - Searched for `Terms|Privacy|subprocessor|acceptable|non-custodial|e-signature|security|analytics|cookie|Sentry|PostHog|Cloudflare|R2|Privy|thirdweb|Filecoin|USDC|Base|Sepolia|production|staging|AWS|KMS|database|email|resend|vercel|workers` in `astro`
>
> </details>
>
> The repo already exposes the main vendors and risk surfaces: thirdweb auth/wallets, Resend email, PostHog analytics, R2/Filecoin storage, Base/Base Sepolia contracts, and non-custodial settlement contracts. I’m reading the actual legal page drafts now so the questions target missing policy choices, not implementation facts.
>
> <details><summary>Explored 9 files</summary>
>
> - Read `./apps/astro/src/pages/terms.astro`
> - Read `./apps/astro/src/pages/security.astro`
> - Read `./apps/astro/src/pages/legal/non-custodial-settlement.astro`
> - Read `./apps/astro/src/pages/legal/e-signature-validity.astro`
> - Read `./apps/astro/src/pages/privacy.astro`
> - Read `./apps/server/env.ts`
> - Read `./project/settlements/architecture-and-non-custody.md`
> - Read `./apps/astro/src/pages/subprocessors.astro`
> - Read `./apps/astro/src/pages/acceptable-use.astro`
>
> </details>
</details>

Yes. Based on the repo, I can see the technical skeleton, but the legal/trust copy needs business and compliance decisions from you. Answer these bluntly. If something is unknown, say `TBD`.

**Company / Legal Entity**

1. What legal entity will operate Filosign? No entity yet, India entity, US Delaware C-Corp, or something else?
2. What name should legal pages use today: `Filosign`, `Filosign Inc.`, `Kartikay Tiwari`, or placeholder?
3. What governing law do you want for ToS disputes before counsel review: Delaware, California, India, or TBD?
4. Do you want arbitration/class-action waiver language, or keep it simple until counsel reviews?

**Product Stage**

5. Is the live app currently public beta, invite-only beta, staging/testnet only, or production-ready?
6. Are real payments enabled today, or only testnet/mock USDC?
7. What is the expected mainnet chain for launch: Base mainnet?
8. Will users upload real confidential documents during beta, or should beta terms discourage sensitive uploads?

**Users / Eligibility**

9. Are you allowing anyone to sign up, or only approved users/design partners?
10. Minimum user age: 18+?
11. Are consumers allowed, or is Filosign strictly business/professional use?
12. Will you support users from EU/UK, US, India, and other countries at launch, or restrict any region?

**E-Signature Positioning**

13. Do you want to claim Filosign creates valid electronic signatures, or only that it provides evidence supporting electronic signature workflows?
14. Are you willing to exclude high-risk document types from supported use: wills, divorce/family law, real estate transfers, court filings, government notices, medical consent, regulated financial instruments?
15. Should users be required to consent to electronic records/signatures before signing?
16. Do you need signer identity verification beyond wallet/email/social login in v1?

**Documents / Data**

17. Who can see plaintext documents in v1: only sender/recipients, or can Filosign/admins ever decrypt?
18. Are files encrypted client-side 100% of the time before upload?
19. Where are encrypted files stored today: Cloudflare R2, Filecoin Onchain Cloud, both, or environment-dependent?
20. What is your retention policy: keep until user deletes, fixed retention by plan, or indefinite unless deleted?
21. Can users permanently delete encrypted documents and metadata from your database/R2?
22. What cannot be deleted: on-chain records, transaction hashes, audit logs, email delivery logs?

**Infrastructure / Vendors**

23. Hosting provider for client/server/marketing: Vercel, Fly.io, Cloudflare, Hetzner, something else?
24. Database provider: Neon, Supabase, Railway, self-hosted Postgres, something else?
25. Object storage provider: Cloudflare R2? Any AWS S3?
26. Email provider: Resend only?
27. Auth/wallet provider: thirdweb only, or Privy/Silk/WalletConnect too?
28. Analytics: PostHog enabled in production? Telegram alerts? Any Google Analytics?
29. Billing provider: Dodo Payments live or planned only?
30. Blockchain RPC/indexing providers: thirdweb, Alchemy, Ankr, QuickNode, public Base RPC, others?
31. Do you use AI vendors on user data anywhere? If no, we should explicitly say documents are not used to train AI models.

**Security**

32. Do you have a dedicated security email yet, e.g. `security@filosign.xyz`?
33. Do you want a vulnerability disclosure policy now?
34. Any smart contract audit done? If no, should we say unaudited until audited?
35. Are admin actions logged?
36. Do you have backups for Postgres/R2 yet?
37. Do you have incident response commitments, or should we keep it as “we will notify as required by law”?

**Payments / Crypto**

38. Is settlement strictly non-custodial `transferFrom` from payer wallet to recipient wallet?
39. Does Filosign ever take custody, escrow, pool, convert, or route funds? I assume no.
40. Will Filosign charge fees on settlement volume, or only SaaS subscription?
41. Will you support fiat/on-ramp/off-ramp in v1? I assume no.
42. Will you support tokens beyond USDC in v1?
43. Do you plan wallet/sanctions screening before production? Which provider, if known?
44. Who is responsible for taxes, invoices, reporting, and legality of payouts: user only?

**Privacy / Compliance**

45. Who is the privacy contact email?
46. Do you want GDPR/UK GDPR language now, or keep a lightweight global privacy policy?
47. Do you want India DPDP Act language?
48. Do you want California/US state privacy language?
49. Do you want cookie consent before PostHog/non-essential analytics for EU visitors?
50. Do you sell/share personal data for ads? I assume no.
51. Do you process children’s data? I assume no.
52. Do you want a DPA/subprocessor page ready for teams, or just a simple public list for now?

**Commercial Terms**

53. Is pricing live yet, or still beta/free?
54. Will paid plans be monthly/annual subscriptions?
55. Refund policy: no refunds, prorated refunds, or case-by-case?
56. Can you suspend users for abuse/nonpayment/security risk?
57. Do you want SLA/support commitments now, or explicitly no SLA during beta?

**Public Trust Pages**

58. Should `/security` be written as a polished trust center or a modest “current security model” page?
59. Should `/subprocessors` list real vendors now, even if incomplete, or stay as “coming soon” until final?
60. Should legal pages include big “not legal advice” disclaimers at top, or softer inline disclaimers?

Most important answers: 1-8, 13-21, 23-31, 38-44. Those determine whether the drafts are credible or legally risky.

> Okay, let's see.
>
> Legal entity: I am going to use Dodo Payments and register as an individual. Yes, no Filosign yet as a registered entity for now. Once we have revenue, then we can register as an entity. I don't know, I do want to use Filosign and avoid using my personal name. We use Dodo Payments for merchant of record. We are approved for live payment, so we can launch in production with live subscription payments. I don't understand the fourth question, but yeah, go ahead with whatever you think is the best for me to keep my company and me safe from regulations and compliance. No, there was a staging version that will drop. I will create a production and a sandbox version. Sandbox will be running the same application but on Testnet for users and individuals to test, and the production will be behind entitlements enforced by Dodo Payments as a merchant of record for us. Initial outreach will be invite only, but I think people can use the sandbox for free. I'm not sure yet. Sandbox is merely for testing, so the data can be lost in there, and I can clear the user accounts to keep everything on the free quota. Yes, I am considering base mainnet for prod and base sepulia for Sandbox. There is no beta anymore, so users will upload confidential documents or sensitive agreements. It's encrypted, so make that clear: we cannot even see your document or your confidential data. The metadata and everything we can see, so you keep that at your risk to provide us with what information you're providing. The idea is that we are giving you encryption for your files so that we don't see the data. We will have to store the metadata of the file, recipient information, and PII, so those things are there. For production, I will keep it behind the paywall so anyone who wants to buy a subscription can use the platform. Yes, I think the minimum user age should be 18+, the legal age in your country, I think, but I'm not sure if that is relevant. If it is relevant, then put whatever the appropriate legal age is. Do people need to use the platform? Yes, consumers are allowed. There is an individual plan and a teams plan, so individuals can buy the individual subscription, of course, so consumers will be allowed. I am planning to launch Filosign globally, and we are not liable for any jurisdiction. That's what our Terms of Service should explicitly define: that it is legally binding for you to check based on your jurisdiction. We provide you with the e-signatures and the tools, etc., for facilitating settlements. We don't actually do custodial things, i guess? Frame that as you deem necessary. I don't know what to claim and what not to claim. I need your information on that. Whatever we are doing is cryptographic e-signatures with audit trails. Now, is this valid? That will depend on rules and regulations, so we can't know that. Right now we only have this. Later on we might have integrations with the QVS, etc., but not right now. As far as I know, we are legally binding in the US, but I don't have any legal advice yet. So yes, right now it basically provides evidence supporting we are using the cryptography behind it, right? Isn't it the same as a wallet signature? I'd like your expert opinion on that. Yes, I am going to exclude high-risk document types from supported use, like wills, etc., anything that requires physical signatures or should not be using an e-signature service like ours, right? But I am not sure where that differentiation lies, so that's why we should write a blanket to cover us from jurisdictions and legally binding should be the responsibility of the users. We provide the e-signature. You decide if this e-signature is useful for you or not. I don't know the answer to question 15. Should there be consent? I don't know what that means. Does that mean consent as in while signing up, or do you mean before signing the document? Because I think if you look into the code, we already have on-chain signatures based on your clicks. When you acknowledge a document and when you sign a document, you are explicitly clicking buttons that will initiate signatures from your wallet. That means you are giving us consent, right? Is that correct, or were you talking about something else? So right now, no identity verification beyond mandatory email verification is in place. I believe that is enough to get started, but I am not sure. Maybe for payments to enable the payment feature, we could request identity verification. Would that be a good idea? Should I do that? But it is permissionless and connected to the user's own wallet, so if they decide to do it, should it concern us as a platform? Should we take their identity verified before we allow the signature feature? What are your thoughts on that?
>
> Filosign can never see your documents, plain text. Only the sender and recipients, and the people that the sender shares the magic link plus cold invite secret code with, can ever open the document. It is gated by who the sender decides to let see a document. And yes, files are encrypted end-to-end on the client side 100% of the time, before upload, even for drafts! We never see your files in plain text. Encrypted ciphertext blobs are stored in Cloudflare R2 right now, and they will be moved to Filecoin on Chin Cloud if you choose to pay for archival storage optionally.  Everything that I'm talking about, I will talk about production because that is more important than the sandbox. Sandbox is not even in place right now, so we just worry about production first, and we can later think about Sandbox in a different past. So, my retention policy for the Filecipher text, which is encrypted already, so we cannot see it. We will keep it based on your plan in Cloudflare R2 or Filecoin Onchain Cloud. For example, if you pay for archival storage, we can store it for five years, depending on if you want it to go there or not. For now, everything is stored on R2, and I will configure a deletion policy after notifying the user, similar to whatever industry standard giants like DocuSign or Documenso do with your files.  Do they store it for six months or one year? I don't know. It will cost us money to store anyway, so we'll have to clean it up, I think. However, we always let you download the file and the compliance record, both, as long as we store it. So I don't know. Right now, it's forever indefinite, but we might introduce a retention policy later. Do we have to do it, though? Can we just keep it indefinitely because we are charging the user?  Or maybe we can keep the file as long as they are paying for the subscription, and once they are done paying the subscription, we move it to Filecoin on Chit Cloud automatically or something in between. I have not decided that yet.  You can suggest what you think should be recommended. Yes, users can request permanent deletion of encrypted documents and metadata from my database and R2. Of course, if they want to export their data and ask us to delete it, we will let them do that. However, public on-chain records cannot be deleted, but they do not upload any personal information. Everything is hashed or encrypted anyway (check code if u need to). Hosting provider for client side is Cloudflare pages, and server is hosted on my Hetzner VPS. Database might be hosted with a standard supabase or neon based on whichever suits (or I might run my own Postgres instance on Hetzner VPS in future but TBD). Object storage provider: Cloudflare R2. Email provider: we will switch to Amazon SES (rn resend). Auth/wallet provider: thirdweb. Analytics: yes. PostHog will be enabled in production.  Telegram alerts are only for server-side crashes, so nothing to do with the user, no user data logged i think. Billing provider is Dodo Payments as MoR. Blockchain RPC indexing providers are thirdweb for now. No AI in app anywhere. I do not have any dedicated security department or email yet. I have my kartik@filosign.xyz (founder email) active.  I can route all these other domains to be aliases and send to the same inbox ofc. About 33, I am not sure if I need a vulnerability disclosure policy. What would it look like? No smart contracts audits have been done. That should only be disclosed if inquired about, of course, so I don't think we need to publicly post that. Admin actions logged? What do you mean, "Admin actions logged"? I'm the only admin right now, but there is no admin panel yet. I will make an admin panel, and I will log it, of course, so assume yes, admin actions are logged, but why? Should it be logged or should it not be logged? Say I will be using Supabase and R2 3-tier or their standard tiers. I think backups are included in that, right? But yes, of course, I will configure backup somehow, so say yes to backups! I don't know what 37 means, incident response commitment. If you can explain that to me, it would be nice, and suggest what we should do. I don't have anything configured for that yet. Yes, please make sure you clear that out! Settlement is strictly non-custodial. Check the code in detail to understand how it works. Check the smart contract, check the integration; it's client-side. The server does not hold any funds or deposit any funds. There is no escrow, nothing. Don't assume, verify in the code base! We will not charge any fees on the settlement volume. We are only charging for the SaaS subscription. fiat onramp will be done using thirdweb pay. We will never manage any funds. We will let third parties integrate and let them take care of the on ramp or off ramp, so Filosign will never deal with the user funds. Yeah, I mean, we can technically support any ERC20 token, but to keep it safe, we have USDC. We could technically support other tokens as well in the future. But as far as right now, we only support stable coins (USDC on Base). Users need to be informed that any funds sent to their wallet or taken out from their wallet is their fucking responsibility, and we don't know anything about it. We can't control your wallet! We can only facilitate functions or let you export your wallet entirely, but that will be at your own risk. We do not use wallets to provide you with a crypto wallet. We only let you fund USDC on Base. Any funds sent apart from USDC on base will not show up in your profile balance. We might support other stable coins in the future or improve our infrastructure, but not in v1. We do not plan to have wallet or sanction screening right now, because we are going to enable the settlement feature based on manual verification. You can request the settlement feature from your profile. Once we manually authorize you to do that after verifying or screening it ourselves, then you can use the feature. We will enable it using a feature flag. So as of now, we do not have any automatic wallet screening functionalities.  By the way, side note is a question for you. If I cannot afford a wallet screening service right now, how should I mitigate the risks to me personally from regulations? Is this enough that the settlement feature is locked behind manual screening and approval gate? Or should I just let it be open for everybody who buys a paid plan? Do I have any risks because of that? Yes, the user is solely responsible for all the transactions, taxes, invoices, reporting, and legality of payouts. Yes, the user is solely responsible for all the transactions, taxes, invoices, reporting, and legality of payouts. They are solely responsible for that.  We are just a facilitator, and we will let you have access to your wallet and important features like send, receive, withdraw, etc. That's all. all important emails will route to kartik@filosign.xyz (alias via no-reply@filosign.xyz, support@filosign.xyz, contact@filosign.xyz, security@filosign.xyz, sales@filosign.xyz etc so i can filter my inbox cleanly but communications and outbound messages and emails will go from kartik@filosign.xyz). I don't know, but I think I would prefer GDPR/UK GDPR language if that helps? Are there any downsides of using that language? I want to cover myself completely and shield myself from any legal troubles or regulation clawbacks so yes,  I want all the standard language that should be applicable. this is going to be a global company so,  California/US state privacy language + GDPR/UK GDPR language should be good. if you think it is required "cookie consent before PostHog/non-essential analytics for EU visitors" then yes i will build it. I think it is for client-side cookies, right? Do you think it would be just for PostHog because I don't think I have anything else, maybe Cloudflare? If you think I need it to launch, then I will build it. Let me know. No, we do not sell or share personal data for ads ever! No, we do not process children's data. Age is strictly 18+ or legal age required to use the platform, and the users must consent to that. I'm not verifying the age, by the way, but it's users duty. If a user breach the terms of service, we are not liable i suppose. I think I do need a DPA / sub-processor page. plan that out. What would it include? You can see all my integrations from the code base.  Pricing will be live on prod, yes. Plans will be monthly or annual, both. Annuals will be discounted rates.
>
> Now, coming to refunds and chargebacks: centered to resolve legitimate refund request via support and aggressively mitigating chargebacks. I made an agent generate some policy rules that I need you to audit and review and pick whatever you think I should adopt:
>
> "To make this legally binding and deter chargebacks, you need two distinct pieces of writing: the **Legal Terms of Service Clause** (which protects you during bank arbitrations) and the **Dashboard/UI Text** (which changes user behavior before they call the bank).
>
> Here is exactly what you should write for Filosign.
>
> ---
>
> ### 1. The Legal Policy (For your Terms of Service page)
>
> This is the rigid, unyielding text that Dodo Payments’ representment team will submit to the bank to win a dispute if someone ignores your warnings.
>
> > #### 4. Fees, Billing, and Refund Policy
> >
> >
> > **4.1 Non-Refundable Fees.** All fees paid to Filosign are completely non-refundable and non-transferable, except as required by law or as explicitly stated herein. Since Filosign provides digital infrastructure and on-chain document signing resources immediately upon subscription or usage, all sales are final.
> > **4.2 Subscription Cancellations.** You may cancel your subscription at any time through your billing dashboard. Cancellation will prevent future renewals, but no prorated refunds will be issued for the remaining period of your current billing cycle.
> > **4.3 Chargebacks and Billing Disputes.** If you believe you have been billed in error, you must contact our support team (`support@filosign.com`) to request a resolution prior to contacting your financial institution. **Filing a chargeback, payment dispute, or reversal request with your bank or card issuer constitutes a breach of these Terms.**
> > Filosign reserves the right to immediately, permanently, and without notice suspend or terminate your account, restrict your access to the platform, and delete associated data if a chargeback or payment dispute is initiated against transactions related to your account.
>
> ---
>
> ### 2. The Dashboard Text (For your Billing / Settings UI)
>
> This is the psychological barrier. Place this directly under the payment history table or near the "Cancel Subscription" button on your front-end dashboard. Use clean, bold typography.
>
> > **Billing Issue or Refund Request?**
> > Please do not file a dispute or chargeback with your bank. If you made a mistake, forgot to cancel, or have an unauthorized charge, contact us directly at **support@filosign.com**. Valid refund requests submitted within 7 days of the transaction are processed immediately.
> > *Note: Initiating a bank chargeback forces an automated security trigger that permanently suspends your Filosign account, restricting access to all your signed documents, identity configurations, and data.*
>
> ---
>
> ### 3. The Email Copy (For automated Invoice / Renewal emails)
>
> Include this in the footer of every invoice or renewal notice sent by Dodo to stop buyers' remorse or accidental auto-renewals from escalating.
>
> > **Questions about this invoice?**
> > If you did not intend to renew or believe this charge was made in error, please reply directly to this email or contact `support@filosign.xyz` within 48 hours. We handle legitimate mistakes quickly. Please do not file a dispute with your bank, as bank chargebacks result in automated account termination and data loss.
>
> ### Operational Rule of Thumb
>
> With this text live, your operational workflow is simple:
>
> 1. If they email you within 7 days complaining about a renewal or mistake, **click refund in Dodo instantly.**
> 2. If they ignore all of this and file a chargeback anyway, **suspend the account immediately** and let Dodo submit Section 4.3 to the bank to reclaim your funds."
>
>  it might have errors or contextual mistakes because it does not know everything about my platform, but then you should make sure you fix that yourself. the idea is to make refunds easy in case it matches our policies. We'll give you a window for that, and if you file a chargeback, you are risking your account for suspension to mitigate that risk;  by default, no refunds. If you buy a plan that you're not supposed to buy, just reach out to us.
>
>  figure out all the edge cases for that. yes, the platform reserves all the rights to suspend accounts, or take some action: block features, allow features, we are offering a service, just as any other service like docusign or documents or any other SaaS-based business. We reserve the right to decide who can or cannot use our platform. I do not want any SLA  right now, when launching.  I can not guarantee uptime or anything, so I am working alone as a solo founder and dev on this.  and finally, yes, all the pages, any of the pages that you have created, need to be updated based off our latest convo

<details><summary>10 previous messages</summary>

> I’m going to verify the settlement path in code before I lock the legal wording. The risky part is not the copy; it’s accidentally saying “non-custodial” while some server path actually touches funds, so I’ll check the contracts and server/client flow now.
>
> <details><summary>Explored 4 files, searched web 1 time</summary>
>
> <details><summary>Explored 4 files</summary>
>
> - Read `./apps/server/lib/domains/settlements/settlements-register.ts`
> - Read `./packages/react-sdk/src/lib/settlement-rules.ts`
> - Read `./apps/contracts/src/FSPaymentValidator.sol`
> - Read `./apps/server/lib/domains/settlements/utils/execute-payout.ts`
>
> </details>
>
> <details><summary>Searched web 1 time</summary>
>
> - Searched web for `FTC ESIGN Act electronic signatures consumer consent electronic records official`
>
> </details>
>
> </details>
>
> The settlement claim checks out: the contract registers rules from the payer, then later pulls ERC-20 with `transferFrom`; the server relay only calls `executePayout` and checks balance/allowance. That supports “non-custodial,” with the important caveat that the user’s approval creates token-spend risk they must understand.
>
> <details><summary>Explored 1 file, 1 search</summary>
>
> - Read `./apps/contracts/src/FSFileRegistry.sol`
> - Searched for `cidIdentifier|privySubjectCommitment|signerEmailCommitment|emailCommitment|registerFile|sign|ack|hash` in `client`
>
> </details>
>
> A few decisions still materially change the terms and privacy policy. I can default them, but these are worth locking because they affect refund policy, retention promises, and crypto-risk posture.
>
> User input response
>
> - What should the public legal pages say about who operates Filosign before an entity exists?
>   - Filosign + owner
> - How should v1 settlement access be controlled?
>   - Manual approval
> - What retention policy should we write for production documents?
>   - Plan-based
>
> Good. I’ll use those defaults: Filosign as service name with operator details marked for counsel, settlement locked behind manual approval, and plan-based retention with export/grace windows. I have one more batch because billing and privacy wording are places founders accidentally create obligations they do not want.
>
> User input response
>
> - Which refund policy should v1 use for Dodo subscription payments?
>   - 7-day goodwill
> - How aggressive should account action be after chargebacks or payment disputes?
>   - Suspend features
> - What should the privacy plan assume for analytics/cookies at launch?
>   - Consent banner
>
> Plan
>
> # Filosign Legal & Trust Pages Update Plan
>
> ## Summary
> Update Filosign’s legal/trust pages for a paid production launch where Filosign is operated as a service brand before entity formation, Dodo Payments acts as merchant of record for subscriptions, documents are client-side encrypted, settlement is non-custodial USDC on Base, and settlement access is manually approved.
>
> Key legal posture:
> - Filosign provides software, not legal, tax, payroll, escrow, custody, money transmission, or identity-verification services.
> - E-signatures should be framed as evidence-supporting electronic signature workflows, not guaranteed validity in every jurisdiction.
> - Settlement stays behind manual approval/feature flag until screening/compliance is stronger.
> - Users are responsible for document suitability, taxes, invoices, payout legality, wallet security, and jurisdiction-specific compliance.
>
> ## Key Changes
>
> ### Terms of Service
> - Use “Filosign” as the service name, with a counsel TODO for final operator/entity details.
> - Add acceptance, authority, age 18+/legal age, business/consumer use, account responsibility, electronic communications, and e-signature consent.
> - Add excluded/high-risk documents: wills, trusts, family law, court filings, government notices, regulated financial/legal documents, or anything requiring notarization/wet ink unless user verifies suitability.
> - Add payment terms:
>   - Dodo Payments as merchant of record/payment processor.
>   - Monthly/annual subscriptions.
>   - Default no refunds, but 7-day goodwill refund window for mistaken purchases/renewal issues at support discretion.
>   - Chargebacks may suspend paid features and settlement access, but preserve reasonable export access unless fraud/security/legal risk exists.
> - Add non-custodial settlement terms:
>   - USDC on Base only for v1.
>   - User approves exact token allowance from their wallet.
>   - Filosign relay may call `executePayout`, but never holds funds.
>   - No settlement-volume fee.
>   - User is responsible for taxes, invoices, reporting, recipient correctness, wallet security, token risks, and payout legality.
> - Add feature gate:
>   - Settlement requires paid plan plus manual approval/feature flag.
>   - Filosign may deny, suspend, revoke, or limit settlement access for abuse, sanctions, fraud, legal, security, or operational risk.
> - Add no-SLA/beta-style reliability language for solo-founder launch: service provided as available, no uptime commitment.
>
> ### Privacy Policy
> - Expand data categories:
>   - account/profile data, email, wallet address, org/team data, recipient data, metadata, encrypted ciphertext, audit/proof data, transaction hashes, billing records, support messages, logs, analytics.
> - State clearly:
>   - Documents are encrypted client-side before upload.
>   - Filosign cannot read plaintext document contents in normal operation.
>   - Metadata and recipient/PII are still processed and visible to the service.
>   - On-chain records cannot be deleted.
>   - No sale/share of personal data for ads.
>   - No AI training or AI processing of user documents.
>   - No children/minors.
> - Add GDPR/UK GDPR, California/US privacy, and India DPDP-style rights language at a practical level.
> - Add cookie/analytics section:
>   - PostHog is non-essential analytics.
>   - Implement consent banner for jurisdictions requiring opt-in.
> - Add deletion/export:
>   - Users may request export/deletion of account data, encrypted documents, metadata, and R2 records where feasible.
>   - Public blockchain records, security logs, billing/tax records, and legally required records may remain.
>
> ### Trust Pages
> - `/security`
>   - State encryption model, what Filosign can/cannot see, wallet/key responsibility, admin access principles, backups, security contact, vulnerability reporting path.
>   - Do not claim audits, SOC 2, ISO, formal pen test, or guaranteed zero-knowledge.
>   - Smart contracts: say contracts are part of the system and should be treated as unaudited unless/until audited, ideally in a measured security/risk section.
> - `/legal/e-signature-validity`
>   - Explain intent, consent, attribution, integrity, retention, audit trail, and jurisdiction limits.
>   - Add “not legal advice” and “user decides suitability.”
>   - Avoid “legally binding everywhere” and “eIDAS/QES compliant.”
> - `/legal/non-custodial-settlement`
>   - Explain register rule, approve USDC, signing condition, relay/user execution, and revoke allowance.
>   - Warn that incorrect recipients, approvals, wallet compromise, network issues, and direct contract interactions are user risk.
> - `/acceptable-use`
>   - Expand prohibited uses: sanctions, fraud, money laundering, terrorist financing, illegal goods/services, unauthorized personal data, harassment, spam, malware, illegal payouts, regulated financial activity without authorization.
> - `/subprocessors`
>   - Replace placeholder with a real table:
>     - Cloudflare: Pages/R2/CDN/storage.
>     - Hetzner: server hosting.
>     - Supabase/Neon/TBD: database.
>     - Amazon SES/Resend: transactional email.
>     - thirdweb: auth/wallet/RPC.
>     - PostHog: analytics.
>     - Dodo Payments: billing/MoR.
>     - Base/public blockchain infrastructure: transaction processing.
>   - Mark database/email provider as “current/planned/TBD” where not finalized.
>
> ## Product/UI Requirements
> - Add explicit e-sign consent before signing, not just ToS signup consent:
>   - “By clicking Sign, I agree to use electronic records and signatures for this document and understand Filosign does not determine legal suitability.”
> - Add settlement approval warning before enabling payouts:
>   - “You are approving USDC from your wallet. Filosign does not custody funds and cannot reverse executed blockchain transactions.”
> - Add billing UI copy:
>   - Encourage users to contact `support@filosign.xyz` for refund/billing issues.
>   - Do not threaten document deletion for chargebacks.
>   - Say disputes may suspend paid features and settlement access while preserving export access where legally/operationally possible.
> - Add cookie consent for PostHog before global production launch.
>
> ## Test Plan
> - Run Astro build.
> - Search for risky claims:
>   - `legally binding`, `eIDAS compliant`, `QES`, `escrow`, `custody`, `money transmitter`, `storage forever`, `permanent storage`, `guaranteed`, `SLA`, `audited`.
> - Verify all footer/legal links resolve.
> - Verify ToS, Privacy, Security, Acceptable Use, Subprocessors, E-signature Validity, and Non-custodial Settlement render on desktop/mobile.
> - Verify sign flow has e-sign consent copy.
> - Verify settlement UI has USDC approval/non-custody warning.
> - Verify billing UI does not imply automatic deletion or full lockout after chargeback.
>
> ## Assumptions
> - Production chain: Base mainnet; sandbox/test environment later on Base Sepolia.
> - v1 settlement token: USDC on Base only.
> - Settlement is manually approved via feature flag.
> - Dodo Payments handles subscription checkout as merchant of record.
> - No fiat custody, no wallet custody, no settlement-volume fees, no AI processing.
> - No formal legal review, smart contract audit, SOC 2, ISO 27001, or SLA yet.
> - Legal pages are strong product/legal-risk drafts, but final production launch should still get counsel review.
>
> References used for standards: [Dropbox Sign Terms](https://sign.dropbox.com/en-GB/terms), [Dropbox Sign Privacy](https://sign.dropbox.com/about/privacy), [Dropbox Sign legality explainer](https://help.dropbox.com/security/is-dropbox-sign-legally-binding), [Docusign Terms](https://www.docusign.com/en-gb/legal/terms-and-conditions), [FTC ESIGN material](https://www.ftc.gov/sites/default/files/documents/reports/report-congress-electronic-signatures-global-and-national-commerce-act-consumer-consent-provision/esignreport.pdf), and [FinCEN virtual currency guidance](https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-persons-administering).
>
> Plan implementation
>
> Status: running
> # Filosign Legal & Trust Pages Update Plan
>
> ## Summary
> Update Filosign’s legal/trust pages for a paid production launch where Filosign is operated as a service brand before entity formation, Dodo Payments acts as merchant of record for subscriptions, documents are client-side encrypted, settlement is non-custodial USDC on Base, and settlement access is manually approved.
>
> Key legal posture:
> - Filosign provides software, not legal, tax, payroll, escrow, custody, money transmission, or identity-verification services.
> - E-signatures should be framed as evidence-supporting electronic signature workflows, not guaranteed validity in every jurisdiction.
> - Settlement stays behind manual approval/feature flag until screening/compliance is stronger.
> - Users are responsible for document suitability, taxes, invoices, payout legality, wallet security, and jurisdiction-specific compliance.
>
> ## Key Changes
>
> ### Terms of Service
> - Use “Filosign” as the service name, with a counsel TODO for final operator/entity details.
> - Add acceptance, authority, age 18+/legal age, business/consumer use, account responsibility, electronic communications, and e-signature consent.
> - Add excluded/high-risk documents: wills, trusts, family law, court filings, government notices, regulated financial/legal documents, or anything requiring notarization/wet ink unless user verifies suitability.
> - Add payment terms:
>   - Dodo Payments as merchant of record/payment processor.
>   - Monthly/annual subscriptions.
>   - Default no refunds, but 7-day goodwill refund window for mistaken purchases/renewal issues at support discretion.
>   - Chargebacks may suspend paid features and settlement access, but preserve reasonable export access unless fraud/security/legal risk exists.
> - Add non-custodial settlement terms:
>   - USDC on Base only for v1.
>   - User approves exact token allowance from their wallet.
>   - Filosign relay may call `executePayout`, but never holds funds.
>   - No settlement-volume fee.
>   - User is responsible for taxes, invoices, reporting, recipient correctness, wallet security, token risks, and payout legality.
> - Add feature gate:
>   - Settlement requires paid plan plus manual approval/feature flag.
>   - Filosign may deny, suspend, revoke, or limit settlement access for abuse, sanctions, fraud, legal, security, or operational risk.
> - Add no-SLA/beta-style reliability language for solo-founder launch: service provided as available, no uptime commitment.
>
> ### Privacy Policy
> - Expand data categories:
>   - account/profile data, email, wallet address, org/team data, recipient data, metadata, encrypted ciphertext, audit/proof data, transaction hashes, billing records, support messages, logs, analytics.
> - State clearly:
>   - Documents are encrypted client-side before upload.
>   - Filosign cannot read plaintext document contents in normal operation.
>   - Metadata and recipient/PII are still processed and visible to the service.
>   - On-chain records cannot be deleted.
>   - No sale/share of personal data for ads.
>   - No AI training or AI processing of user documents.
>   - No children/minors.
> - Add GDPR/UK GDPR, California/US privacy, and India DPDP-style rights language at a practical level.
> - Add cookie/analytics section:
>   - PostHog is non-essential analytics.
>   - Implement consent banner for jurisdictions requiring opt-in.
> - Add deletion/export:
>   - Users may request export/deletion of account data, encrypted documents, metadata, and R2 records where feasible.
>   - Public blockchain records, security logs, billing/tax records, and legally required records may remain.
>
> ### Trust Pages
> - `/security`
>   - State encryption model, what Filosign can/cannot see, wallet/key responsibility, admin access principles, backups, security contact, vulnerability reporting path.
>   - Do not claim audits, SOC 2, ISO, formal pen test, or guaranteed zero-knowledge.
>   - Smart contracts: say contracts are part of the system and should be treated as unaudited unless/until audited, ideally in a measured security/risk section.
> - `/legal/e-signature-validity`
>   - Explain intent, consent, attribution, integrity, retention, audit trail, and jurisdiction limits.
>   - Add “not legal advice” and “user decides suitability.”
>   - Avoid “legally binding everywhere” and “eIDAS/QES compliant.”
> - `/legal/non-custodial-settlement`
>   - Explain register rule, approve USDC, signing condition, relay/user execution, and revoke allowance.
>   - Warn that incorrect recipients, approvals, wallet compromise, network issues, and direct contract interactions are user risk.
> - `/acceptable-use`
>   - Expand prohibited uses: sanctions, fraud, money laundering, terrorist financing, illegal goods/services, unauthorized personal data, harassment, spam, malware, illegal payouts, regulated financial activity without authorization.
> - `/subprocessors`
>   - Replace placeholder with a real table:
>     - Cloudflare: Pages/R2/CDN/storage.
>     - Hetzner: server hosting.
>     - Supabase/Neon/TBD: database.
>     - Amazon SES/Resend: transactional email.
>     - thirdweb: auth/wallet/RPC.
>     - PostHog: analytics.
>     - Dodo Payments: billing/MoR.
>     - Base/public blockchain infrastructure: transaction processing.
>   - Mark database/email provider as “current/planned/TBD” where not finalized.
>
> ## Product/UI Requirements
> - Add explicit e-sign consent before signing, not just ToS signup consent:
>   - “By clicking Sign, I agree to use electronic records and signatures for this document and understand Filosign does not determine legal suitability.”
> - Add settlement approval warning before enabling payouts:
>   - “You are approving USDC from your wallet. Filosign does not custody funds and cannot reverse executed blockchain transactions.”
> - Add billing UI copy:
>   - Encourage users to contact `support@filosign.xyz` for refund/billing issues.
>   - Do not threaten document deletion for chargebacks.
>   - Say disputes may suspend paid features and settlement access while preserving export access where legally/operationally possible.
> - Add cookie consent for PostHog before global production launch.
>
> ## Test Plan
> - Run Astro build.
> - Search for risky claims:
>   - `legally binding`, `eIDAS compliant`, `QES`, `escrow`, `custody`, `money transmitter`, `storage forever`, `permanent storage`, `guaranteed`, `SLA`, `audited`.
> - Verify all footer/legal links resolve.
> - Verify ToS, Privacy, Security, Acceptable Use, Subprocessors, E-signature Validity, and Non-custodial Settlement render on desktop/mobile.
> - Verify sign flow has e-sign consent copy.
> - Verify settlement UI has USDC approval/non-custody warning.
> - Verify billing UI does not imply automatic deletion or full lockout after chargeback.
>
> ## Assumptions
> - Production chain: Base mainnet; sandbox/test environment later on Base Sepolia.
> - v1 settlement token: USDC on Base only.
> - Settlement is manually approved via feature flag.
> - Dodo Payments handles subscription checkout as merchant of record.
> - No fiat custody, no wallet custody, no settlement-volume fees, no AI processing.
> - No formal legal review, smart contract audit, SOC 2, ISO 27001, or SLA yet.
> - Legal pages are strong product/legal-risk drafts, but final production launch should still get counsel review.
>
> References used for standards: [Dropbox Sign Terms](https://sign.dropbox.com/en-GB/terms), [Dropbox Sign Privacy](https://sign.dropbox.com/about/privacy), [Dropbox Sign legality explainer](https://help.dropbox.com/security/is-dropbox-sign-legally-binding), [Docusign Terms](https://www.docusign.com/en-gb/legal/terms-and-conditions), [FTC ESIGN material](https://www.ftc.gov/sites/default/files/documents/reports/report-congress-electronic-signatures-global-and-national-commerce-act-consumer-consent-provision/esignreport.pdf), and [FinCEN virtual currency guidance](https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-persons-administering).
</details>
