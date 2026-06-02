# Secrets (Infisical — server only)

Server secrets for deployed tiers live in [Infisical Cloud](https://app.infisical.com). Local dev uses **`apps/server/.env.local`**. **Contracts** deploy/migrate use **`apps/contracts/.env.local`**, **`.env.staging`**, and **`.env.production`** (gitignored).

| `DEPLOYMENT` | Infisical env | Server secrets | Contracts (laptop deploy) |
|--------------|---------------|----------------|---------------------------|
| `local` | — | `apps/server/.env.local` | `apps/contracts/.env.local` |
| `staging` | `staging` | Infisical | `apps/contracts/.env.staging` |
| `sandbox` | `sandbox` | Infisical | `apps/contracts/.env.staging` (same testnet chain) |
| `production` | `prod` | Infisical (Dokploy) | `apps/contracts/.env.production` |

**Client** and **Astro** on Cloudflare Pages (`VITE_*` / `PUBLIC_*`). Local client env:

- Internal staging: [`apps/client/.env.staging.example`](../client/.env.staging.example) → `apps/client/.env.staging`
- Public sandbox: [`apps/client/.env.sandbox.example`](../client/.env.sandbox.example) → `apps/client/.env.sandbox`

Full matrix: [`project/launch/environments.md`](../../project/launch/environments.md).

Every server env must set **`DEPLOYMENT`** and an allowed **`CHAIN`** (`staging`/`sandbox` → `testnet`; `production` → `mainnet` or `testnet`).

### Chain JSON-RPC (`CHAIN_RPC_URL`)

| `DEPLOYMENT` | `CHAIN_RPC_URL` |
|--------------|-----------------|
| `local`, `staging`, `sandbox` | **Do not set** — ignored; viem public testnet/Hardhat URLs only |
| `production` | **Optional** in Infisical `prod` — primary JSON-RPC for the configured `CHAIN` (thirdweb, Alchemy, QuickNode, etc.) |

When set on production, the server uses `fallback([primary, public default])` where the public URL is `mainnet.base.org` or `sepolia.base.org` per `CHAIN`. When unset, only the public URL is used.

**Client (optional):** `VITE_CHAIN_RPC_URL` in production Pages env only — same production-only rule; not required for launch (server relayer is the critical path).

### Email delivery (Resend + SES fallback)

| Variable | Role |
|----------|------|
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_ENABLED` | **Primary** sender (keep using free tier when healthy) |
| `SES_ENABLED`, `SES_REGION`, `SES_FROM_EMAIL` | **Fallback** only when all are set — any deployment (Infisical prod recommended) |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Optional if the host uses an IAM role for SES |
| `SES_CONFIGURATION_SET` | Optional tracking |

Flow: every send tries Resend first. On retryable Resend errors (429, 5xx, timeouts), the server attempts SES once if configured. Validation errors (4xx) do not trigger SES.

Verify the same From domain in [Resend](https://resend.com) and [Amazon SES](https://console.aws.amazon.com/ses/) (DKIM/SPF). Leave `SES_ENABLED=false` on local unless you are testing fallback.

Contract env keys: `FC_DEPLOYER_PRIVATE_KEY`, `FC_SERVER_ADDRESS`, `FC_OWNER_ADDRESS`, `ALCHEMY_API_KEY`, `ETHERSCAN_API_KEY` (see [`apps/contracts/env.ts`](../contracts/env.ts)). On-chain addresses for the app come from [`definitions/`](../../apps/contracts/definitions/) via `CHAIN` — after redeploy, run migrate and align `FC_SERVER_ADDRESS` with `FSEnvelopeRegistry.server()` ([migration note](../../project/contracts/envelope-registry-migration.md)).

---

## 1. Infisical dashboard (server)

1. Open project **Filosign** (linked via [`.infisical.json`](../../.infisical.json)).
2. Environments **`staging`**, **`sandbox`**, and **`prod`** with server keys from [README Environment](../../README.md).
3. Per env: set `DEPLOYMENT` + `CHAIN` (see table above). `DODO_*` required for `staging` and `prod`; optional for `sandbox`.
4. Copy **Project ID** → `INFISICAL_PROJECT_ID` in Dokploy.

**Laptop (server):** `infisical login`, then e.g. `bun run dev:staging` / `db:push:staging` in `apps/server`.

---

## 2. Machine identities (Dokploy)

| Identity | Infisical env | `DEPLOYMENT` |
|----------|---------------|--------------|
| `filosign-server-staging` | `staging` | `staging` |
| `filosign-server-sandbox` | `sandbox` | `sandbox` |
| `filosign-server-production` | `prod` | `production` |

Bootstrap env only: `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `INFISICAL_PROJECT_ID`, `INFISICAL_ENV`.

Entrypoint: [`scripts/infisical-entrypoint.sh`](scripts/infisical-entrypoint.sh).

---

## 3. Commands

```bash
# Server (apps/server, after infisical login)
bun run dev:staging
bun run dev:sandbox
bun run db -- push staging
bun run db -- migrate sandbox
bun run db -- purge sandbox

# Contracts (apps/contracts — no Infisical)
bun run deploy:testnet
bun run migrate:testnet

# Full stacks from repo root
bun run dev -- --staging    # internal QA
bun run dev -- --sandbox    # public sandbox parity
```
