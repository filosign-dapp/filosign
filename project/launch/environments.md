# Filosign deployment environments

Single `main` branch; four **deployments** differentiated by `DEPLOYMENT` + Infisical env + isolated data.

## Tiers

| `DEPLOYMENT` | Infisical | `CHAIN` | Audience | Signup | Entitlements | Dodo billing |
|--------------|-----------|---------|----------|--------|--------------|--------------|
| `local` | `.env.local` | `local` | Developer laptop | **Invite or paid** (mirrors prod) | Catalog enforced | Test mode |
| `staging` | `staging` | `testnet` | Internal QA | **Invite or paid** (mirrors prod) | Full enforce | Test mode |
| `sandbox` | `sandbox` | `testnet` | Public demo | **Open** | No-op (open) | Test mode |
| `production` | `prod` | `mainnet` | Paying users | **Invite or paid** | Full enforce | Live mode |

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
- `DODO_API_KEY` / `DODO_WEBHOOK_KEY` — required on every tier (test mode except `production`, which uses live mode via `dodoLive()`)

Client build vars (see `apps/client/.env*.example`):

- `VITE_DEPLOYMENT` — must match server tier for that stack
- `VITE_CHAIN` — must match `DEPLOYMENT` (see `@filosign/shared` `DEPLOYMENT_CHAIN`)

Runtime oRPC `runtime.deployment` and `runtime.signupPolicy` expose server tier and signup gating to the client.

### Signup gate vs entitlements (two layers)

| Layer | What it controls | Production today |
|-------|------------------|------------------|
| **Signup** (`signupPolicy`, `assertRegistrationAllowed`) | Who may **create an account** (invite, paid checkout, or cold doc invite) | `invite_or_paid` — no organic free signup yet |
| **Registration** (`assertRegistrationComplete` on authenticated RPC) | User finished onboarding (`users` row exists) | Same on gated tiers |
| **Entitlements** (`assertEntitlement`, catalog `free` plan) | Feature limits **after** login | Enforced on prod/staging/local; skipped on sandbox demo |

Expired partner trials (`expirePartnerTrials` → subscription `canceled`) **keep dashboard access**. `effectivePlanIdFromStatus` maps them to catalog **`free`** (3 docs/month, 1 recipient per envelope in `catalog/v1`). That is intentional: retention + export paths stay available while paid features drop off.

The **`free` plan in the catalog** is the long-term self-serve tier. Production signup stays gated until GA; when opened, the same catalog limits apply without changing the post-trial downgrade path.


Use a **separate Thirdweb project / client ID per deployment tier** so sandbox MAU does not consume production’s free tier:

| Tier | `VITE_THIRDWEB_CLIENT_ID` | Signup UX |
|------|---------------------------|-----------|
| `sandbox` | Sandbox Thirdweb project | Open (Connect modal + Google/Apple) |
| `local` | Local/dev project | Invite or paid (email OTP on `/`) |
| `staging` | Staging project | Invite or paid (email OTP on `/`) |
| `production` | Production project | Invite or paid (email OTP on `/`) |

Set matching IDs in Infisical for each server/client stack. **Only sandbox** keeps the legacy Connect modal; local/staging/production use programmatic email OTP on `/` when a valid gate token is present.

### Platform admin

- `ADMIN_WALLETS` — comma-separated admin wallet addresses on the server (see [`metrics-handlers.ts`](../../apps/server/api/handlers/metrics-handlers.ts))
- Admin UI: `/admin` (wallet must be in `ADMIN_WALLETS`)

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
- **Production launch:** follow [`production-checklist.md`](production-checklist.md) (deploy, env, smoke, legal gates)
