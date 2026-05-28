# Secrets (Infisical — server only)

Staging and production **server** secrets live in [Infisical Cloud](https://app.infisical.com). Local dev uses **`.env.local`**. **Contracts** deploy/migrate still use **`apps/contracts/.env.local`**, **`.env.staging`**, and **`.env.production`** (gitignored).

| Tier | Server | Contracts (local laptop) |
|------|--------|-------------------------|
| Local | `apps/server/.env.local` | `apps/contracts/.env.local` |
| Staging / testnet | Infisical `staging` | `apps/contracts/.env.staging` |
| Production / mainnet | Infisical `prod` (Dokploy) | `apps/contracts/.env.production` |

**Client** and **Astro** stay on **Cloudflare Pages** (`VITE_*` / `PUBLIC_*`). For local testnet UI, use [`.env.staging.example`](../../.env.staging.example) → repo-root `.env.staging` (`VITE_*` only).

Contract env keys: `FC_DEPLOYER_PRIVATE_KEY`, `FC_SERVER_ADDRESS`, `FC_OWNER_ADDRESS`, `ALCHEMY_API_KEY`, `ETHERSCAN_API_KEY` (see [`apps/contracts/env.ts`](../contracts/env.ts)).

---

## 1. Infisical dashboard (server)

1. Open project **Filosign - Staging** (linked via [`.infisical.json`](../../.infisical.json)).
2. Environments **`staging`** and **`prod`** with server keys from [README Environment](../../README.md).
3. Set **`CHAIN=testnet`** in staging, **`CHAIN=mainnet`** in prod.
4. Copy **Project ID** → `INFISICAL_PROJECT_ID` in Dokploy.

**Laptop (server only):** `infisical login`, then `bun run dev:testnet` / `db:push:testnet` in `apps/server`.

---

## 2. Machine identities (Dokploy)

| Identity | Infisical env |
|----------|----------------|
| `filosign-server-staging` | `staging` |
| `filosign-server-prod` | `prod` |

Bootstrap env only: `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `INFISICAL_PROJECT_ID`, `INFISICAL_ENV` (`staging` | `prod`).

Entrypoint: [`scripts/infisical-entrypoint.sh`](scripts/infisical-entrypoint.sh).

---

## 3. Commands

```bash
# Server (apps/server, after infisical login)
bun run dev:testnet
bun run db:push:testnet

# Contracts (apps/contracts — .env.staging / .env.production, no Infisical)
bun run deploy:testnet
bun run migrate:testnet

# Full testnet stack: server via Infisical; client VITE_* in .env.staging
bun run dev -- --testnet
```
