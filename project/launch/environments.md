# Filosign deployment environments

Single `main` branch; four **deployments** differentiated by `DEPLOYMENT` + Infisical env + isolated data.

## Tiers

| `DEPLOYMENT` | Infisical | `CHAIN` | Audience | Entitlements | Dodo billing |
|--------------|-----------|---------|----------|--------------|--------------|
| `local` | `.env.local` | `local` | Developer laptop | Catalog enforced | Off |
| `staging` | `staging` | `testnet` | Internal QA | Full enforce | Test mode |
| `sandbox` | `sandbox` | `testnet` | Public demo | No-op (open) | Off |
| `production` | `prod` | `mainnet` | Paying users | Full enforce | Live mode |

Staging and sandbox share **testnet contract addresses** (`definitions/testnet.ts`). Isolation is Postgres, S3, Dragonfly, URLs, and policy.

## Example URLs

| Tier | Client | API |
|------|--------|-----|
| Staging | `staging.filosign.xyz` | `api-staging.filosign.xyz` |
| Sandbox | `sandbox.filosign.xyz` | `api-sandbox.filosign.xyz` |
| Production | `app.filosign.xyz` | `api.filosign.xyz` |

Marketing (`filosign.xyz`) should set `PUBLIC_CLIENT_URL` to the **sandbox** client until mainnet GA.

## Required env (server)

Every deployed server needs:

- `DEPLOYMENT` — one of `local` | `staging` | `sandbox` | `production`
- `CHAIN` — must match tier (`staging`/`sandbox` → `testnet`, `production` → `mainnet`, `local` → `local`)
- `DODO_API_KEY` / `DODO_WEBHOOK_KEY` — required for `staging` and `production`; optional for `local` and `sandbox`

Client build vars (see `apps/client/.env*.example`):

- `VITE_DEPLOYMENT` — must match server tier for that stack
- `VITE_CHAIN` — must match `DEPLOYMENT` (see `@filosign/shared` `DEPLOYMENT_CHAIN`)

Runtime oRPC `runtime.deployment` exposes server tier to the client.

## Local commands

```bash
# Internal staging stack (Infisical staging + apps/client/.env.staging)
bun run dev -- --staging

# Public sandbox stack (Infisical sandbox + apps/client/.env.sandbox)
bun run dev -- --sandbox

# Hardhat local
bun run dev -- --local

bun run db -- push staging
bun run db -- push sandbox
bun run db -- purge sandbox

bun run contracts -- --migrate --testnet   # chain deploy + staging DB push
```

## Infisical

Create **`sandbox`** environment in the Filosign project alongside existing `staging` and `prod`. Set `DEPLOYMENT=sandbox`, `CHAIN=testnet`, and sandbox-specific PG/S3/URLs.

Dokploy machine identities (example):

- `filosign-server-staging` → Infisical `staging`
- `filosign-server-sandbox` → Infisical `sandbox`
- `filosign-server-production` → Infisical `prod`

See [`apps/server/SECRETS.md`](../../apps/server/SECRETS.md).

## Cloudflare Pages

Three client projects (staging, sandbox, production) from the same `main` commit, each with matching `VITE_DEPLOYMENT` / `VITE_CHAIN` / `VITE_SERVER_URL`.

## Pre-production notes

- Purge `staging` or `sandbox` DB anytime: `bun run db -- purge staging|sandbox`
- Production stack can remain undeployed until mainnet contracts and live Dodo products are ready
