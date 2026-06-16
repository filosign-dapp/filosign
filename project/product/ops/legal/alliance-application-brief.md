# Filosign Alliance Application Brief

Purpose: **form answers** for the Alliance application. Messaging SSOT: [`../../../../sales/strategy/positioning.md`](../../../../sales/strategy/positioning.md). Credibility and safe claims: [`../../../../sales/strategy/claims.md`](../../../../sales/strategy/claims.md).

## 1. Short Positioning

Use one-liners from [`positioning.md`](../../../../sales/strategy/positioning.md). Alliance default: **Private e-signatures with instant crypto payouts** (50-char limit: **E-signatures that trigger instant USDC payouts**).

## 2. What Filosign Is

Filosign is a wallet-native document signing platform for encrypted agreements, verifiable signing records, and non-custodial stablecoin settlement.

Users can send documents, invite recipients, collect signatures, export proof records, and optionally attach USDC payout rules that execute when signing conditions are met. Documents are encrypted in the browser, signing records are anchored on-chain, and payment settlement uses **non-custodial push** payouts (`transferFrom` per leg via `FSPaymentValidator`) so Filosign never custodies funds.

Product: [filosign.xyz](https://filosign.xyz) · Sandbox: [sandbox.filosign.xyz](https://sandbox.filosign.xyz)

Current status: see [`../../../scope/roadmap.md`](../../../scope/roadmap.md) § Current Product Status.

## 3. The Crisp Pitch

Traditional e-signature tools stop at “signed.” But many real agreements, especially in crypto, are not complete until money moves.

Filosign turns agreements into programmable workflows: a contractor signs a delivery acceptance, a grant recipient signs a milestone document, or a DAO counterparty signs an OTC agreement, and the corresponding USDC payout can settle automatically. The user experience stays familiar, but the agreement has privacy, public proof, and settlement built in.

## 4. The Problem

Most e-signature platforms have three gaps:

- **Privacy risk:** the vendor can store or access sensitive agreement data.
- **Proof risk:** verification depends on the platform’s database, exports, and long-term survival.
- **Execution gap:** after signing, teams still chase invoices, wire transfers, multisig approvals, and manual payout operations.

For Web3 teams this is worse because agreements often directly control treasury movement, grants, bounties, OTC trades, contractor payments, and ecosystem incentives. Signing and settlement are currently separate systems.

## 5. The Aha Moment

The key insight: **for crypto-native agreements, the signature is not the end state; settlement is.**

DocuSign proves that someone clicked “sign.” Filosign proves who signed, what they agreed to, and lets the related payment settle without trusting Filosign to custody money.

This is the wedge that makes Filosign more than a privacy-focused DocuSign clone.

## 6. Product Wedge

Initial ICP:

- Web3 foundations and grant programs
- DAOs paying contributors or vendors
- crypto startups hiring global contractors
- OTC desks, market makers, and protocols handling sensitive agreements
- hackathon, bounty, and milestone-based payout programs

Initial use cases:

- grant milestone acceptance with USDC payout
- freelancer or contractor handover + instant payment
- DAO contributor agreements
- OTC or private commercial agreements with verifiable proof
- ecosystem bounty payouts tied to signed completion records

Why this wedge works:

- These users already have wallets.
- They already use stablecoins.
- They already need better audit trails.
- They already coordinate globally.
- Their pain is not just signing; it is signing plus proof plus payout.

Concrete wedge anecdote:

During the Filecoin Alpha Cohort, Sarah needed to send $3,000 and requested a W-8BEN. The current flow required sending the form separately, waiting for the signed document, then wiring money to a bank account. With Filosign, she could send the W-8BEN through Filosign, the recipient could fill/sign it, and the USDC payout could release automatically after signature.

## 7. USP

Filosign combines four things in one workflow:

- **Client-side document encryption:** Filosign stores encrypted blobs, not readable contract contents.
- **On-chain signing proof:** signature records are publicly verifiable instead of platform-dependent.
- **Permanent / long-term storage:** documents can be archived using decentralized storage primitives.
- **Non-custodial USDC settlement:** senders approve exact payout rules; when signing conditions are satisfied, settlement can execute on-chain.

The simplest USP:

**Filosign is the first e-signature workflow where private agreements can trigger non-custodial stablecoin payouts.**

## 8. What To Avoid Saying

Avoid leading with:

- “post-quantum”
- “FVM”
- “Dilithium / ML-KEM”
- “Merkle proofs”
- “decentralized sovereign cloud”
- “permanent public audit trail” without explaining why it matters

These are technically impressive but too early for the first answer. Use them later as proof of technical depth.

Avoid claiming:

- broad legal compliance beyond the current posture
- enterprise readiness if still beta/pre-mainnet
- active revenue or traction unless you have exact numbers
- “escrow” if it implies custody by Filosign

Preferred wording:

- “non-custodial settlement”
- “designed to satisfy core e-sign proof requirements”
- “public beta on Base Sepolia; mainnet launch next”
- “Filecoin-backed/incubated and showcased at Devconnect 2025”

## 9. Founder Story

Kartikay Tiwari is a solo technical founder from Mumbai, India. He writes all the code and has built Filosign end-to-end across product, frontend, backend, cryptography, smart contracts, and infrastructure.

Relevant founder-market fit:

- built Filosign during the Filecoin Alpha Cohort
- ranked 1st overall on the final accumulated Akindo WaveHack leaderboard for the Filecoin Alpha Cohort
- received $6,000 USDC support for Filosign through the cohort
- received 4,000 FIL through Filecoin RetroPGF-3
- received devrel, mentorship, and ecosystem support from Filecoin teams, including FIL-B and FilOz
- showcased Filosign at DePIN Day, Filecoin x Fluence, during Devconnect 2025 in Buenos Aires on Nov 18, 2025
- participated in Loops Hacker House in Buenos Aires during Devconnect 2025
- has warm Filecoin ecosystem pilot interest, including partner conversations around Toku.com
- won METIS Hyperhack 2025 with Haithe, receiving the $30,000 grand prize
- won 3rd place at TRON Grand Hackathon Season 7, receiving $15,000
- 99.4+ percentile in IIT-JEE Mains after a compressed 4-month preparation sprint
- CSE graduate from IIIT Gwalior

Founder narrative:

I am obsessed with making commitments verifiable. Filosign started with human agreements: private documents, independent proof, and settlement that does not depend on a middleman. My broader work in agents and autonomous systems came from the same principle: if software or people can take meaningful actions, those actions need identity, constraints, and receipts.

## 10. Suggested Alliance Application Voice

Tone:

- clear
- direct
- technical but not jargon-heavy
- confident without sounding inflated
- honest about current stage

Use short paragraphs. Alliance explicitly values concise answers. Most answers should be 2-6 sentences.

## 11. Likely Application Answer Blocks

### What does the company do?

Filosign is a private e-signature platform for crypto-native agreements. Teams can send encrypted documents, collect verifiable signatures, and attach non-custodial USDC payout rules that execute when signing conditions are met.

The wedge is agreements where “signed” is not enough: grants, bounties, contractor handovers, DAO contributor agreements, and OTC workflows where money should move only after the right parties sign.

### Why now?

Stablecoins are becoming normal payment rails for global teams, but the agreement layer around them is still stuck in Web2. Crypto teams sign documents in one product, coordinate approvals in chat, and settle payments separately through wallets or multisigs.

Filosign makes the agreement itself programmable. The same flow that captures consent can also create a verifiable settlement condition.

### Why will people use this?

The first users already live in wallets, stablecoins, and global remote work. For them, signing and payment are naturally connected: a grant milestone, contractor delivery, or DAO payout is not complete until the agreement is signed and funds move.

Filosign reduces that workflow from “sign, chase, approve, pay, reconcile” into one cryptographically verifiable flow.

### What have you built?

Filosign already has the core product architecture built: wallet-based accounts, encrypted document envelopes, recipient permissions, signing flows, compliance/proof exports, smart contracts for signing records, and non-custodial USDC settlement rules.

It is live as a public beta at filosign.xyz / testnet product flow. The next step is mainnet launch, design-partner onboarding, and narrowing the first commercial wedge around Web3 grant, contractor, and partner payout workflows.

### What is unique?

Most e-signature platforms optimize for generic business paperwork. Filosign is built for agreements that need privacy, independent proof, and payment execution.

The unique combination is encrypted documents, verifiable signing records, and non-custodial stablecoin settlement in one user flow.

### Competitors

Competitors include DocuSign, Documenso, DocuSeal, OpenSign, and generic contract/payment workflows assembled from signing tools, wallets, and multisigs.

They treat signing as a document event. Filosign treats signing as a business state transition that can safely unlock settlement.

### Business model

Filosign can monetize as a premium B2B SaaS product and later as a developer platform. Initial paid plans can target secure solo users and teams, with higher-value team plans for settlement workflows and future platform plans for API/embedded signing.

The strongest near-term monetization is Web3 teams that already pay for ops tooling and need fewer manual payout workflows.

Internal planned pricing (catalog v1 shipped + future tiers):

- Solo: $20/mo monthly or $15/mo annual
- Teams: $35/user/mo monthly or $29/user/mo annual
- Teams Pro: $59/user/mo monthly or $49/user/mo annual
- Enterprise: custom (catalog entry; sales-led)
- Platform Starter / Platform Pro: planned (not in catalog v1 yet)

Application note: do not lead with the full pricing table unless asked. A cleaner answer is: “B2B SaaS plans for individuals and teams, with higher-priced team and platform tiers for settlement workflows and embedded/API use.”

### Progress

Recommended wording:

Filosign is built and running as a public beta/testnet product at filosign.xyz. We do not have mainnet user traction yet, but the product has strong ecosystem validation: it ranked 1st overall in the Filecoin Alpha Cohort on Akindo, received $6,000 USDC plus 4,000 FIL in Filecoin support/RetroPGF, and was selected to showcase at DePIN Day during Devconnect 2025 in Buenos Aires.

Filecoin team feedback consistently pointed to strong product clarity, UI/UX, enterprise potential, and the need to validate with a narrower customer wedge. We are now using that feedback to focus the launch on Web3 teams that sign documents and release stablecoin payments.

### Founder ability

I am a solo technical founder and built Filosign end-to-end: product, frontend, backend, cryptography, smart contracts, and infrastructure. I have repeatedly shipped complex Web3/AI infrastructure quickly, including Haithe, which won the $30,000 METIS Hyperhack grand prize, and Filosign, which ranked first in the Filecoin Alpha Cohort.

## 12. Pitch Narrative For Interview

If given 60 seconds:

Filosign is private e-signing with instant crypto payouts. The insight is that for crypto teams, the signature is not the end of the workflow. A grant, bounty, contractor handover, or DAO agreement is only complete when the right parties sign and the payment settles.

We built a wallet-native signing platform where documents are encrypted client-side, signatures are verifiable on-chain, and USDC payout rules can execute automatically once signing conditions are met. It feels like a normal signing product, but under the hood it gives Web3 teams proof, privacy, and settlement in one flow.

I built the full product as a solo technical founder. Filosign ranked first in the Filecoin Alpha Cohort, received Filecoin backing, and was selected to showcase at Devconnect 2025. The next milestone is mainnet launch and design partners among Web3 teams that already run grant, contractor, and DAO payout workflows.

## 13. Validation And Traction

Be honest: no mainnet users or revenue yet.

Strong validation signals:

- Filecoin Alpha Cohort, run on Akindo, across four waves
- ranked #1 overall by final accumulated score among submitted apps
- $6,000 USDC grant/support for Filosign
- 4,000 FIL from Filecoin RetroPGF-3
- public Akindo pages:
  - <https://app.akindo.io/wave-hacks/1PRjgGzKaTqXaQBBl>
  - <https://app.akindo.io/communities/xKW2AM4KzcqnR6o2/products/o64pjoeZDtw21WVQ>
- selected/showcased at DePIN Day, Filecoin x Fluence, during Devconnect 2025 in Buenos Aires
- DePIN Day event page: <https://depinspace.co/depinday/>
- ongoing mentorship/support from Filecoin ecosystem teams including FIL-B and FilOz
- potential pilot path through Filecoin ecosystem partners, including Toku.com conversation

Useful Filecoin feedback themes:

- strong product-market-fit potential, but needs sharper ICP
- strong enterprise fit
- one of the best UI/UX projects
- strong delivery, documentation, and test-suite polish
- payments guaranteed by signed contracts is a high-value direction
- go direct to customers in the PL/Filecoin network

Quotes to paraphrase or use carefully:

- “Very clearly articulated problem: centralized e-signature platforms pose platform risk that threatens legal/compliance certainty.”
- “The enterprise fit is clear.”
- “One of the best UI/UX projects.”
- “FiloSign is a sharp, well-defined idea executed with care.”
- “Strong product market fit, would love to see user interviews before building deeper.”

Do not call these customer traction. Call them ecosystem validation, expert feedback, and warm pilot leads.

## 14. Launch Plan

Goal: convert Filecoin ecosystem validation into 10 design partners before/around mainnet.

Initial targets:

- Filecoin ecosystem teams and partners
- Protocol Labs / PL Network companies
- Web3 grant programs
- DAO ops teams
- crypto startups paying global contractors
- India and US businesses that already use cross-border contractors or stablecoin payments

Offer:

- one-month guided pilot
- white-glove onboarding
- configure document + payout workflow for their exact use case
- collect feature requests weekly
- convert successful pilots into paid team plans

Pilot use cases:

- grant milestone document + USDC release
- contractor onboarding / W-8BEN / handover form + payout
- DAO contributor agreement + payout
- partner/vendor agreement + stablecoin settlement

Simple GTM line:

We will start where we already have trust: the Filecoin and broader Web3 ecosystem. The plan is to onboard 10 design partners through warm ecosystem intros, run one-month pilots around signing-plus-payout workflows, and convert the teams that repeatedly need this into paid team plans.

## 15. Legal / Company Status

- Filosign is the primary company for Alliance.
- No entity formed yet.
- Kartikay Tiwari is solo founder, Founder & CEO, 100% expected founder ownership before ESOP/investment.
- Technical founder: yes.
- Currently based in Mumbai, India.
- Full-time commitment: yes.

## 16. Recommended Strategic Choice

For Alliance, Filosign is likely stronger than Fleets if the application is crypto-specific. It has:

- a working product
- Filecoin backing
- crypto-native settlement
- clear Web3 ICP
- founder proof
- accelerator/showcase validation

Do not frame Filosign as generic e-signature. Frame it as **agreement infrastructure for crypto teams that need private signatures and automatic stablecoin settlement.**

## 17. Current Best Application Thesis

**Filosign is the agreement layer for crypto-native work.**

Global Web3 teams already pay contributors, grantees, vendors, and counterparties in stablecoins, but the legal/agreement workflow is still disconnected from settlement. Filosign combines private e-signatures, independent proof, and non-custodial USDC payout rules so a signed agreement can automatically become an executed payment.
