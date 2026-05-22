# Filosign launch & ops todo

Ranked **high → low**. Keep bullets actionable; link detail docs in `project/entitlements/` where relevant.

---

## P0 — Urgent / gate launch

- Modular Smart Contract Migration for mainnet
- **Secrets & key custody:** server relay key (KMS), deployer (KMS), JWT, no keys in client. No .env at all. 
- **Support channel** (email, status page, SLA for paid tiers)!!!
- **Analytics & consent:** PostHog/opt-in if EU traffic.
- **Request Access (invite-only trial):** no signup without code; work-email domains → auto invite; public domains → manual review queue + superadmin tools ([entitlement report § Free Trial](entitlements/entitlement_breakdown_report.md)).
- **Terms of Service + Privacy Policy:** publish on Astro; link from client sign-in / wallet; align with payments, webhooks, zero-knowledge claims — **outline risks with counsel**, not DIY-only. (Search templates and design to reduce risk)
- **Dodo payments:** wire checkout/subscriptions to plans (`[packages/entitlements](../../packages/entitlements)`); test upgrade/downgrade + webhooks. ****Merchant of record terms, refunds, chargebacks, supported countries vs your pricing page.
- **Pricing page:** redesign from new entitlements + `[feature_effort_ranking.md](entitlements/feature_effort_ranking.md)` + competitive/cost reports.
- **Deploy path:** decide Hetzner (multi-node + Docker Swarm) vs managed DB/PaaS; document server + Postgres + secrets + backups.
- **Uptime monitoring + backups** (DB, R2, secrets rotation).
- **Launch funds:** budget ETH/USDC (contracts), server gas relayer, Thirdweb/Gelato credits, Hetzner, domains, legal, first year ops.
- **Counsel review** of ToS, Privacy, cookie/consent (GDPR if EU users), acceptable use, limitation of liability, arbitration venue.
- **Payments & crypto wording:** non-custodial USDC, Gelato/third-party relayers, no money-transmitter claims you can’t support.
- **E-sign legal posture:** which markets you target (US ESIGN/UETA vs EU eIDAS); don’t claim QES until built.
- **Trademark:** “Filosign” search + filing (India/US).
- **CPA / tax advisor:** India vs US entity, GST, export of services, US sales tax (SaaS nexus), crypto/treasury reporting.

- **Incident response:** breach notification playbook (even pre-SOC2).
- **Waitlist / Request Access ops:** who reviews manual queue, SLA, fraud (disposable emails).
- **Founder-led sales script** for first 10 design partners before “marketing scale.”
- **Competitive claims audit:** pricing page vs DocuSign/HelloSign — only claim what’s shipped
- **Subprocessor register** — a *table of vendors* that process data for you; often linked from Privacy Policy and from **DPA** templates for teams.

---

## P1 — Product & GTM (near launch)

- **Dashboard walkthroughs / tutorials:** per major flow (onboard, send, sign, payments, compliance export, team).
- **Platform feedback:** lightweight in-app ratings/comments per feature; store + review pipeline (not only ad-hoc).
- **Review suggested features:** prioritize from `[feature_effort_ranking.md](entitlements/feature_effort_ranking.md)`.
- **Three products — positioning & roadmap:**
  1. **Filosign** (end users / teams)
  2. **Filosign SDK / Platform** (e-sign API, embed, webhooks)
  3. **Filosign Agents SDK** (AI agents) — refine existing pieces; formal research doc (Cursor / notebook).
- **SEO (Astro):** meta, sitemap, structured data, Search Console, performance — `[apps/astro](../../apps/astro)`.
- **Storage strategy:** Filecoin / Onchaincloud vs **R2-only for v1?** — decide before marketing durability claims.
- **Sales strategy + partner integrations:** who to sell to first (Web3 legal, OTC, DAOs); integration partners (wallets, L2s, identity).
- **Contract templates:** B2B order form / MSA for teams and Platform customers later.

---

## P2 — Business & jurisdiction (before scaling revenue)

- **Entity:** sole proprietor vs incorporated (India / US / both); cap table, founder agreements if co-founders.
- **India vs US pricing:** FX, tax, payment rails (Dodo/regions), display currency, refund policy.
- **India incorporation now → US later?** migration path (entity flip, contracts, data, banking, customer contracts) — **lawyer + CPA**.
- **Banking & invoicing:** business account, GST/export if India sells abroad, US W-8/W-9 if US entity.
- **Cyber / E&O insurance** (often asked by teams before pilot).

---

## P3 — Later (first enterprise / scale)

- **Enterprise compliance:** SOC 2, ISO 27001, pen test, DPAs, subprocessors list, insurance — when you have paying enterprise leads (`[project/compliance/](compliance/)` if present).
- **Accessibility** (WCAG) if selling to enterprises later.
- **eIDAS / QES, SSO, BYOK, SIEM** — only when deal-driven (`[feature_effort_ranking.md](entitlements/feature_effort_ranking.md)` XL items).

---

## P4 — Ongoing / research backlog

- **Agents SDK:** architecture, auth, billing meter, safety — dedicated design pass.
- **Gelato + testnet production checklist** (if not already on mainnet/testnet GTM path).
- **Centralized gas ops** (server vs Thirdweb vs Gelato) — optional cost simplification.

