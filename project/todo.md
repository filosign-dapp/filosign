# Filosign company backlog

## Filosign mainnet

Pre-launch notes (priority order):

1. `#legal` **Legal audit (priority one):** Terms of Service, Privacy Policy, and every legal page must be counsel-reviewed so we are shielded from liability. Gate: [`product/ops/legal/readiness-checklist.md`](product/product/ops/legal/readiness-checklist.md).
2. `#product` **Pricing sanity check:** confirm lifetime catalog pricing covers costs, margins, and obligations so nothing is left exposed — source: [`packages/entitlements/src/catalog/v1.ts`](../packages/entitlements/src/catalog/v1.ts) · [`product/packaging/pricing-and-packaging.md`](product/packaging/pricing-and-packaging.md).
3. `#sales` **Design partner invite — multi-seat:** grant **3 members** per design partner so they can onboard their team. Manually test with a custom team via the design partner invite flow before shipping to partners.
4. `#product` **Astro — Launch App CTA:** add a navbar button on the marketing site so existing plan holders can jump straight to the app.
5. `#sales` **Direct support channels:** set up always-on channels between founder and each onboarded team (no wandering for help).

---

Ranked **high → low** backlog. Launch gates live in [`product/ops/production-checklist.md`](product/product/ops/production-checklist.md); legal gate lives in [`product/ops/legal/readiness-checklist.md`](product/product/ops/legal/readiness-checklist.md).

Packaging source of truth: [`packages/entitlements/src/catalog/v1.ts`](../packages/entitlements/src/catalog/v1.ts) · strategy: [`product/packaging/pricing-and-packaging.md`](product/packaging/pricing-and-packaging.md) · effort ranking: [`product/packaging/feature-effort-ranking.md`](product/packaging/feature-effort-ranking.md).

---

## P0 - Urgent / gate launch

- `#ops` **Dodo payments:** run live smoke on prod and confirm merchant terms / refunds / countries vs pricing page.
- `#ops` **Uptime monitoring + backups** (DB, R2, secrets rotation) — production checklist §5.
- `#ops` **Launch funds:** budget ETH/USDC (contracts), settlement relay gas, Thirdweb, Hetzner, domains, legal, first year ops.
- `#sales` **Founder-led sales** for first 10 design partners — [`sales/outbound/playbook.md`](sales/outbound/playbook.md)
- `#sales` **Competitive claims audit:** pricing page vs incumbents; only claim what is shipped.

---

## P1 - Product & GTM (near launch)

- `#product` **Dashboard walkthroughs / tutorials:** onboard, send, sign, payments, compliance export, team.
- `#product` **Platform feedback:** in-app ratings/comments per feature; review pipeline.
- `#product` **Review suggested features:** [`product/packaging/feature-effort-ranking.md`](product/packaging/feature-effort-ranking.md)
- `#product` **Three products - positioning & roadmap:** Filosign app · Platform/SDK · Agents SDK (research doc).
- `#sales` **SEO (Astro):** meta, sitemap, structured data, Search Console.
- `#product` **Storage strategy:** Filecoin / Onchaincloud vs R2-only for v1; decide before durability claims.
- `#sales` **Sales strategy + partner integrations:** Web3 legal, OTC, DAOs; wallet/L2 partners.
- `#legal` **Contract templates:** B2B order form / MSA for teams and Platform customers later.

---

## P1b - On-chain v1 gaps (ops remain)

Reference: [`product/contracts/future-scope.md`](product/contracts/future-scope.md) · redeploy: [`packages/evm/README.md`](../packages/evm/README.md#redeploy--address-rotation)

- `#ops` **Redeploy hygiene:** `migrate:testnet` + align definitions; local `db purge` if `registryAddress` points at old registry.
- `#product` **Settlement update `expiresAt`:** create/attach expose expiry; rule update dialog still amount-only (optional follow-up).

---

## P2 - Business & jurisdiction (before scaling revenue)

- `#legal` **Entity:** sole proprietor vs incorporated (India / US / both); cap table, founder agreements if co-founders.
- `#product` **India vs US pricing:** FX, tax, payment rails (Dodo/regions), display currency, refund policy.
- `#legal` **India incorporation now → US later?** migration path — lawyer + CPA.
- `#ops` **Banking & invoicing:** business account, GST/export, W-8/W-9 if US entity.
- `#ops` **Cyber / E&O insurance** (often asked by teams before pilot).

---

## P3 - Later (first enterprise / scale)

- `#ops` **Enterprise compliance:** SOC 2, ISO 27001, pen test, DPAs, subprocessors, insurance — when you have paying enterprise leads.
- `#product` **Accessibility** (WCAG) if selling to enterprises later.
- `#product` **eIDAS / QES, SSO, BYOK, SIEM** — deal-driven ([`product/packaging/feature-effort-ranking.md`](product/packaging/feature-effort-ranking.md) XL items).

---

## P4 - Ongoing / research backlog

- `#product` **Agents SDK:** architecture, auth, billing meter, safety — dedicated design pass.
- `#ops` **Settlement relay + testnet production checklist** (relayer EOA funded on Base Sepolia/mainnet).
- `#ops` **Centralized gas ops** (server settlement relay vs Thirdweb tx sponsorship) — optional cost simplification.

---

## Completed

Shipped or gate-closed; open follow-ups live under **Filosign mainnet** above.

- `#ops` **Immutable v1 mainnet deploy:** `20260616T021630Z` — verify `owner()`, relayers, validator on Base scan → [`product/ops/production-checklist.md`](product/product/ops/production-checklist.md)
- `#ops` **Secrets & key custody:** server relay key, deployer, JWT; prod via Infisical per [`product/ops/environments.md`](product/product/ops/environments.md)
- `#ops` **Production infra:** Dokploy + two-stack Compose on Hetzner — [`product/ops/dokploy-deploy.md`](product/product/ops/dokploy-deploy.md), [`product/ops/postgres-ops.md`](product/product/ops/postgres-ops.md)
- `#ops` **Analytics & consent:** PostHog wired — [`product/ops/posthog-integration.md`](product/product/ops/posthog-integration.md)
- `#sales` **Request Access (invite-only trial):** code, domain rules, superadmin queue — [`product/packaging/pricing-and-packaging.md`](product/packaging/pricing-and-packaging.md) § Request Access
- `#legal` **Terms of Service + Privacy Policy published on Astro** — counsel review tracked under Filosign mainnet §1
- `#product` **Pricing page on Astro** — aligned with packaging docs; sanity check tracked under Filosign mainnet §2
- `#legal` **Subprocessor register published** — linked from Privacy Policy; counsel pass under Filosign mainnet §1
- `#sales` **Support channel baseline** (email aliases) — direct partner channels tracked under Filosign mainnet §5
- `#product` **Core v1 on testnet:** encrypted envelopes, registry routing/quorum, signer replacement, settlements, compliance bundle v1, teams billing (Dodo wired) — [`product/scope/roadmap.md`](product/scope/roadmap.md) § Shipped
