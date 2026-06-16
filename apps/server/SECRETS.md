# Secrets (Infisical - server only)

Server secrets for deployed tiers live in [Infisical Cloud](https://app.infisical.com). Local dev uses **`apps/server/.env.local`**. **Contracts** deploy/migrate use **`packages/evm/.env.local`**, **`.env.staging`**, and **`.env.production`** (gitignored).

| `DEPLOYMENT` | Infisical env | Server secrets | Contracts (laptop deploy) |
|--------------|---------------|----------------|---------------------------|
| `local` | - | `apps/server/.env.local` | `packages/evm/.env.local` |
| `staging` | `staging` | Infisical | `packages/evm/.env.staging` |
| `sandbox` | `sandbox` | Infisical | `packages/evm/.env.staging` (same testnet chain) |
| `production` | `prod` | Infisical (Dokploy) | `packages/evm/.env.production` |

**Client** and **Astro** on Cloudflare Pages (`VITE_*` / `PUBLIC_*`). Local client env:

- Internal staging: [`apps/client/.env.staging.example`](../client/.env.staging.example) → `apps/client/.env.staging`
- Public sandbox: [`apps/client/.env.sandbox.example`](../client/.env.sandbox.example) → `apps/client/.env.sandbox`

Full matrix: [`project/product/ops/environments.md`](../../project/product/ops/environments.md).

Every server env must set **`DEPLOYMENT`** and an allowed **`CHAIN`** (`staging`/`sandbox` → `testnet`; `production` → `mainnet` or `testnet`).

### Chain JSON-RPC (`CHAIN_RPC_URL`)

| `DEPLOYMENT` | `CHAIN_RPC_URL` |
|--------------|-----------------|
| `local`, `staging`, `sandbox` | **Do not set** - ignored; viem public testnet/Hardhat URLs only |
| `production` | **Optional** in Infisical `prod` - primary JSON-RPC for the configured `CHAIN` (thirdweb, Alchemy, QuickNode, etc.) |

When set on production, the server uses `fallback([primary, public default])` where the public URL is `mainnet.base.org` or `sepolia.base.org` per `CHAIN`. When unset, only the public URL is used.

**Client (optional):** `VITE_CHAIN_RPC_URL` in production Pages env only - same production-only rule; not required for launch (server relayer is the critical path).

### Email delivery (Resend + SES fallback)

| Variable | Role |
|----------|------|
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `RESEND_ENABLED` | **Primary** sender (`RESEND_FROM_NAME` sets inbox display name, e.g. `Filosign`) |
| `SES_ENABLED`, `SES_REGION`, `SES_FROM_EMAIL` | **Fallback** only when all are set - any deployment (Infisical prod recommended) |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Optional if the host uses an IAM role for SES |
| `SES_CONFIGURATION_SET` | Optional tracking |

Flow: every send tries Resend first. On retryable Resend errors (429, 5xx, timeouts), the server attempts SES once if configured. Validation errors (4xx) do not trigger SES.

Verify the same From domain in [Resend](https://resend.com) and [Amazon SES](https://console.aws.amazon.com/ses/) (DKIM/SPF). Leave `SES_ENABLED=false` on local unless you are testing fallback.

Contract env keys: `FC_DEPLOYER_PRIVATE_KEY`, `RELAYER_POOL`, `FC_OWNER_ADDRESS`, `ALCHEMY_API_KEY`, `ETHERSCAN_API_KEY` (see [`packages/evm/env.ts`](../../packages/evm/env.ts)). On-chain addresses for the app come from [`packages/evm/definitions/`](../../packages/evm/definitions/) via `CHAIN` - after redeploy, run migrate and ensure every `RELAYER_POOL` address is an on-chain relayer ([`packages/evm/README.md` redeploy section](../../packages/evm/README.md#redeploy--address-rotation)).

### Relayer pool (on-chain txs)

| Env | Role |
|-----|------|
| `RELAYER_POOL` | Comma-separated relayer addresses (N=2 in production) |
| `RELAYER_POOL_PRIVATE_KEYS` | Matching private keys; bootstrap checks key ↔ address and `isRelayer` on registry |

Fund each pool wallet with ETH on Base for register, sign relay, settlement, and attachment gas.

### Filecoin / FOC (Synapse)

`FOC_WALLET_PRIVATE_KEY` and `FOC_WALLET_ADDRESS` power [`@filoz/synapse-sdk`](https://docs.filecoin.cloud/) - **platform backup** for all **paid workspaces** (not only archival SKU). Fund with **USDFC** (Filecoin Pay) and **FIL** (gas). See [`docs/foc-storage-lifecycle.md`](docs/foc-storage-lifecycle.md).

| Env | Role |
|-----|------|
| `R2_HOT_DAYS` | Days after envelope completion before FOC replicate (default **30**); R2 stays primary |
| `TEST_FOC` | Prod smoke only: immediate FOC replicate + prefer FOC download when replicated. **Unset after test.** |
| `WORKSPACE_CHURN_GRACE_DAYS` | After workspace sub ends, retain blobs (default **90**) |
| `ARCHIVAL_EXPORT_GRACE_DAYS` | After **archival** sub lapses, export window (default **30**) |
| `DODO_PRODUCT_ID_ARCHIVAL_*` | Separate Filecoin retention product |

---

## 1. Infisical dashboard (server)

1. Open project **Filosign** (linked via [`.infisical.json`](../../.infisical.json)).
2. Environments **`staging`**, **`sandbox`**, and **`prod`** with server keys from [README Environment](../../README.md).
3. Per env: set `DEPLOYMENT` + `CHAIN` (see table above). `DODO_*` required for `staging` and `prod`; optional for `sandbox`. Pre-launch prod billing: `DODO_LIVE=false` + test `DODO_API_KEY`.
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

Entrypoint: [`scripts/deploy/infisical-entrypoint.sh`](scripts/deploy/infisical-entrypoint.sh).

---

## 3. Commands

```bash
# Server (apps/server, after infisical login)
bun run dev:staging
bun run dev:sandbox
bun run db -- push staging
bun run db -- migrate sandbox
bun run db -- purge sandbox

# Contracts (packages/evm - no Infisical)
bun run contracts -- --migrate --testnet
bun run contracts -- --migrate --mainnet

# Full stacks from repo root
bun run dev -- --staging    # internal QA
bun run dev -- --sandbox    # public sandbox parity
```
