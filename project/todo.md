# Filosign launch & ops todo

Ranked **high → low**. Keep bullets actionable; link detail docs in `project/entitlements/` where relevant.

---

## P0 - Urgent / gate launch

- **Immutable v1 mainnet deploy:** `bun run contracts -- --migrate --mainnet` → verify `owner()`, `server()`, addresses on Base scan → [`launch/production-checklist.md`](launch/production-checklist.md)
- **Secrets & key custody:** server relay key (KMS), deployer (KMS), JWT, no keys in client. No .env at all.
- **Support channel** (email, status page, SLA for paid tiers)!!!
- **Analytics & consent:** PostHog/opt-in if EU traffic.
- **Request Access (invite-only trial):** no signup without code; work-email domains → auto invite; public domains → manual review queue + superadmin tools ([entitlement report § Free Trial](entitlements/entitlement_breakdown_report.md)).
- **Terms of Service + Privacy Policy:** publish on Astro; link from client sign-in / wallet; align with payments, webhooks, zero-knowledge claims - **outline risks with counsel**, not DIY-only. (Search templates and design to reduce risk)
- **Dodo payments:** code wired (wallet Solo + org seat billing, webhooks, portal). **Remaining:** live smoke on prod + merchant terms / refunds / countries vs pricing page.
- **Pricing page:** redesign from new entitlements + `[feature_effort_ranking.md](entitlements/feature_effort_ranking.md)` + competitive/cost reports.
- **Deploy path:** decide Hetzner (multi-node + Docker Swarm) vs managed DB/PaaS; document server + Postgres + secrets + backups.
- **Uptime monitoring + backups** (DB, R2, secrets rotation). See [`launch/production-checklist.md`](launch/production-checklist.md) §5.
- **Launch funds:** budget ETH/USDC (contracts), server settlement relay gas, Thirdweb credits, Hetzner, domains, legal, first year ops.
- **Counsel review** of ToS, Privacy, cookie/consent (GDPR if EU users), acceptable use, limitation of liability, arbitration venue.
- **Payments & crypto wording:** non-custodial USDC, server/wallet settlement relay (no custody), no money-transmitter claims you can’t support.
- **E-sign legal posture:** which markets you target (US ESIGN/UETA vs EU eIDAS); don’t claim QES until built.
- **Trademark:** “Filosign” search + filing (India/US).
- **CPA / tax advisor:** India vs US entity, GST, export of services, US sales tax (SaaS nexus), crypto/treasury reporting.
- **Incident response:** breach notification playbook (even pre-SOC2).
- **Waitlist / Request Access ops:** who reviews manual queue, SLA, fraud (disposable emails).
- **Founder-led sales script** for first 10 design partners before “marketing scale.”
- **Competitive claims audit:** pricing page vs DocuSign/HelloSign - only claim what’s shipped
- **Subprocessor register** - a *table of vendors* that process data for you; often linked from Privacy Policy and from **DPA** templates for teams.

---

## Entitlement catalog inventory

Source of truth: [`packages/entitlements/src/features.ts`](../packages/entitlements/src/features.ts) · plan matrix in [`catalog/v1.ts`](../packages/entitlements/src/catalog/v1.ts).

### Shipped (product implementation exists)

| Key | Notes |
|-----|--------|
| `documents.sent.monthly` | Quota enforced on register / list-upload (free = 3 lifetime; paid = calendar month) |
| `envelope.recipients.max` | Max signers enforced at register |
| `features.shared_templates` | Org template CRUD; `assertEntitlement` in connections-templates |
| `features.team_drafts` | Org envelope drafts (`envelope_drafts`); org permission gated (no separate entitlement assert) |
| `features.draft_review_links` | External draft share links; `assertEntitlement` in drafts/share |
| `features.draft_comments` | E2EE comments on compose drafts; `assertEntitlement` in drafts/share |
| `features.comments` | Post-send E2EE envelope threads; `assertEntitlement` in files/comments |
| `features.envelope.team_visibility` | Org members read org envelopes via `canReadOrg` (no separate entitlement assert) |
| `features.routing.advanced` | On-chain sequential/quorum + register assert; `canSignByRouting` sign UX |
| `features.settlement.basic` | USDC payout packets; `assertEntitlement` in settlements utils |
| `features.settlement.advanced` | Multi-recipient / advanced release rules; settlements utils |
| `features.supplementary_attachments` | Gated file packets; `assertEntitlement` in attachments/register |
| `features.supplementary_attachments.recipient_select` | Per-packet recipient picker (Teams+) |
| `features.supplementary_attachments.conditional_release` | Signature-conditional release (Teams Pro) |
| `features.archival.purchase` | Long-term storage purchase; `assertEntitlement` in archival |

**Pricing matrix:** supplementary attachment rows live in `apps/astro/src/lib/pricing-comparison.ts`.

### Catalog only - not shipped (`teams_pro` + `enterprise`; no `assertEntitlement` yet; hidden on pricing page until built)

| Key | Planned work |
|-----|----------------|
| `features.integrations.custom` | Custom integrations / embed API |
| `features.quota_allocation` | Seat quota allocation UI |
| `features.bulk_send` | CSV bulk send |
| `features.template_folders` | Shared template folders |
| `features.branding.custom` | Custom sign-page branding |
| `features.webhooks` | Outbound webhooks |
| `features.metadata.tags` | Envelope metadata tags |

**Related gaps (not separate catalog flags):** CSV export; **optional signers** (blocked on-chain - `OptionalSignersNotSupported` in v1; use sequential routing + quorum only).

---

## P1 - Product & GTM (near launch)

- **Dashboard walkthroughs / tutorials:** per major flow (onboard, send, sign, payments, compliance export, team).
- **Platform feedback:** lightweight in-app ratings/comments per feature; store + review pipeline (not only ad-hoc).
- **Review suggested features:** prioritize from `[feature_effort_ranking.md](entitlements/feature_effort_ranking.md)`.
- **Three products - positioning & roadmap:**
  1. **Filosign** (end users / teams)
  2. **Filosign SDK / Platform** (e-sign API, embed, webhooks)
  3. **Filosign Agents SDK** (AI agents) - refine existing pieces; formal research doc (Cursor / notebook).
- **SEO (Astro):** meta, sitemap, structured data, Search Console, performance - `[apps/astro](../../apps/astro)`.
- **Storage strategy:** Filecoin / Onchaincloud vs **R2-only for v1?** - decide before marketing durability claims.
- **Sales strategy + partner integrations:** who to sell to first (Web3 legal, OTC, DAOs); integration partners (wallets, L2s, identity).
- **Contract templates:** B2B order form / MSA for teams and Platform customers later.

---

## P1b - On-chain v1 gaps (shipped in app - ops remain)

Reference: [`contracts-future-scope.md`](contracts-future-scope.md) · [`contracts/envelope-registry-migration.md`](contracts/envelope-registry-migration.md)

- **Redeploy hygiene:** `migrate:testnet` + align definitions; local `db purge` if `registryAddress` points at old registry; `db push` for `files.register_routing_json`.
- **Settlement update `expiresAt`:** create/attach expose expiry; rule update dialog still amount-only (optional follow-up).

---

## P2 - Business & jurisdiction (before scaling revenue)

- **Entity:** sole proprietor vs incorporated (India / US / both); cap table, founder agreements if co-founders.
- **India vs US pricing:** FX, tax, payment rails (Dodo/regions), display currency, refund policy.
- **India incorporation now → US later?** migration path (entity flip, contracts, data, banking, customer contracts) - **lawyer + CPA**.
- **Banking & invoicing:** business account, GST/export if India sells abroad, US W-8/W-9 if US entity.
- **Cyber / E&O insurance** (often asked by teams before pilot).

---

## P3 - Later (first enterprise / scale)

- **Enterprise compliance:** SOC 2, ISO 27001, pen test, DPAs, subprocessors list, insurance - when you have paying enterprise leads (`[project/compliance/](compliance/)` if present).
- **Accessibility** (WCAG) if selling to enterprises later.
- **eIDAS / QES, SSO, BYOK, SIEM** - only when deal-driven (`[feature_effort_ranking.md](entitlements/feature_effort_ranking.md)` XL items).

---

## P4 - Ongoing / research backlog

- **Agents SDK:** architecture, auth, billing meter, safety - dedicated design pass.
- **Settlement relay + testnet production checklist** (relayer EOA funded on Base Sepolia/mainnet).
- **Centralized gas ops** (server settlement relay vs Thirdweb tx sponsorship) - optional cost simplification.

