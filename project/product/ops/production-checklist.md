# Production launch checklist (contracts v1)

Use after code is green (`bun run sanity`) and before opening `app.filosign.xyz` traffic.

Related: [`environments.md`](environments.md), [`oss/packages/contracts/ARCHITECTURE.md`](../../oss/packages/contracts/ARCHITECTURE.md), [`apps/server/SECRETS.md`](../../apps/server/SECRETS.md).

---

## 1. Pre-deploy gate (local)

```bash
bun run sanity                              # full CI (includes Hardhat)
bun run --cwd oss/packages/contracts compile
cd oss/packages/contracts && slither . --exclude-dependencies   # triage per oss/packages/contracts/README.md
```

**Slither:** `arbitrary-send-erc20` on `executePayout` is expected (pull from `rule.payer`). Document triage in PR/deploy notes.

---

## 2. Mainnet contract deploy (immutable, one-time)

**Infisical `prod` secrets:**

| Variable | Purpose |
|----------|---------|
| `FC_DEPLOYER_PRIVATE_KEY` | Deployer hot wallet |
| `RELAYER_POOL` | Comma-separated relayer addresses for `initialRelayers` (must match server `RELAYER_POOL`) |
| `FC_OWNER_ADDRESS` | Optional cold owner (2-step handoff) |

**Deploy:**

```bash
bun run contracts -- --migrate --mainnet
```

This runs tests then deploys; regenerates `packages/evm/definitions/chains/mainnet/`, `definitions/abis/`, and `definitions/generated/mainnet.ts` (never hand-edit generated output).

**Verify on Base scan:**

- [ ] `FSEnvelopeRegistry.owner()` - cold owner if handoff started
- [ ] Pending owner → cold wallet calls `acceptOwnership()`
- [ ] Each `RELAYER_POOL` address has `FSEnvelopeRegistry.isRelayer(addr) === true` in Infisical prod
- [ ] `FSPaymentValidator` constructor args: correct registry address + `chainId` (8453)
- [ ] `FSEnvelopeRegistry.setSatelliteContracts(paymentValidator, attachmentRelease)` called once in deploy script (write-once; verify `paymentValidator()` and `attachmentRelease()` non-zero)

**Post-deploy:** commit updated `definitions/chains/**`, `definitions/abis/**`, and `definitions/generated/**` if addresses or ABIs changed. Re-sync org controllers on the new registry (prod Infisical env):

```bash
bun run --cwd apps/server scripts/sync-org-controllers.ts
```

**Primary DB migrate on deploy:** app containers auto-migrate on start ([`dokploy-deploy.md`](dokploy-deploy.md)). Laptop fallback: `bun run prod -- --migrate`.

---

## 3. Production server + database

App containers run migrations on start. Use laptop migrate only as fallback:

```bash
bun run prod -- --migrate
```

Schema includes `organization_subscriptions` (Dodo IDs, `seatCount`, `billingInterval`, `cancelAtPeriodEnd`).

**Infisical prod (server):**

| Variable | Value |
|----------|-------|
| `DEPLOYMENT` | `production` |
| `CHAIN` | `mainnet` |
| `DODO_API_KEY` | Live mode key |
| `DODO_WEBHOOK_KEY` | Webhook signing secret |
| `CLIENT_URL` | `https://app.filosign.xyz` |
| `RELAYER_POOL` / `RELAYER_POOL_PRIVATE_KEYS` | N relayer wallets (production: N=2) |
| `FOC_WALLET_ADDRESS` / `FOC_WALLET_PRIVATE_KEY` | Synapse storage payer (not in pool) |

Product IDs are hardcoded in [`billing.ts`](../../apps/server/lib/domains/billing/billing.ts) / [`policy.ts`](../../apps/server/lib/domains/billing/policy.ts). Override with `DODO_PRODUCT_ID_*` env vars only if dashboard SKUs change.

**Dodo dashboard:**

- [ ] Webhook URL → `https://api.filosign.xyz/...` (prod billing webhook route)
- [ ] Live products match code (Solo/Teams/Teams Pro monthly + yearly)

**Relay funding:**

- [ ] Fund every `RELAYER_POOL` address with ETH on Base for register, sign relay, settlement, and attachment gas
- [ ] Hourly cron alerts via Telegram when balance &lt; 0.02 ETH (`server.relayer_gas_low`) on staging/production

**Deploy stacks:**

- [ ] Server: Infisical `prod` machine identity
- [ ] Client (Cloudflare Pages): `VITE_DEPLOYMENT=production`, `VITE_CHAIN=mainnet`, `VITE_SERVER_URL=https://api.filosign.xyz`

**Startup validation (automatic):** `index.ts` awaits bootstrap before Bun serves traffic - relayer pool key ↔ address ↔ `isRelayer` on-chain, FOC wallet consistency, then Dragonfly `PING`. `/health` returns 503 until ready.

---

## 4. Production smoke (manual)

Run on prod stack with a test wallet before GA:

| # | Flow | Pass |
|---|------|------|
| 1 | Wallet login + off-chain keygen registration | |
| 2 | Solo checkout (live Dodo) → webhook → entitlements | |
| 3 | Create org → Teams checkout (`quantity = seats`) → webhook seat sync | |
| 4 | Send envelope with routing (parallel/sequential + quorum) | |
| 5 | Sign → `registerEnvelopeSignature` visible on Base scan | |
| 6 | Settlement: payer `registerRule` + USDC `approve` → auto or manual settle | |
| 7 | Compliance PDF export (bundle v1, correct registry/validator addresses) | |
| 8 | Cancel-at-period-end: plan stays until `subscription.expired` | |
| 9 | Customer portal return URL lands on workspace/profile settings | |

---

## 5. Legal / ops gates

See [`../../todo.md`](../../todo.md) and [`legal/readiness-checklist.md`](legal/readiness-checklist.md). Minimum before paid traffic:

- [ ] Terms of Service + Privacy published on Astro, linked from client sign-in
- [ ] Support channel (email + status page)
- [ ] Monitoring + DB/R2 backups
- [ ] Counsel review: e-sign claims, non-custodial USDC wording, GDPR if EU
- [ ] Terms disclose registry **`onlyRelayer`** relay for register/sign/void/clear/amend (Filosign relayer pool executes after user EIP-712 authorization)
- [ ] Dodo merchant terms aligned with pricing page (refunds, countries)
