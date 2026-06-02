# @filosign/server

Hono API, Drizzle/Postgres, thirdweb auth verification, S3, and chain/indexer helpers for Filosign.

## Run

- Local: `bun run dev:local` (`.env.local` via `--env-file`; `SERVER_ROLE=all` runs HTTP + crons)
- Worker only (local): `bun run dev:worker:local` (`SERVER_ROLE=worker` in env)
- Staging: `bun run dev:staging` (Infisical `staging`; `infisical login` first)
- Sandbox: `bun run dev:sandbox` (Infisical `sandbox`)

Deploy splits **api** (`./server`, HTTP) and **worker** (`./worker`, `Bun.cron` + `fs:worker:heartbeat`) — see [`deploy/compose.app.yml`](../../deploy/compose.app.yml).

Secrets layout: [`SECRETS.md`](SECRETS.md). Local server uses **`--env-file`**; staging/prod server uses **`infisical run`** (contracts keep `apps/contracts/.env.*`).

## Structure

| Path | Role |
|------|------|
| `api/integrations/` | Partner webhooks — before session middleware |
| `api/orpc/` | oRPC **`/api/rpc`** + OpenAPI **`/api/api-reference`** (see `hono-mount.ts`, `router.ts`) |
| `api/handlers/` | oRPC procedure implementations (**`ORPCError`**, reuse `tryCatch`) |
| `api/orpc/hono-mount.ts` | **`apiRouter`** — integrations, then optional thirdweb Bearer + oRPC on `/api` |
| `lib/platform/cache/` | Dragonfly cache-aside (`cache-aside.ts`, `cache-keys.ts`, `invalidate.ts`) + session / verify rate limit |
| `lib/platform/server-role.ts` | `SERVER_ROLE` gates (`api` / `worker` / `all`) |
| `worker.ts` | Background entry: crons, heartbeat, no HTTP (`./worker`) |
| `lib/platform/cron/` | `Bun.cron` jobs + per-tick `lock:cron:{job}:{bucket}` locks |
| `lib/platform/worker/heartbeat.ts` | `fs:worker:heartbeat` for worker container health |
| `lib/domains/` | Business logic by bounded context (orgs, files, settlements, sharing, users, entitlements, invites, runtime) — shared by handlers, indexer, cron |
| `lib/platform/` | Shared infra: `db/`, `indexer/`, `cron/`, `evm`, `s3/`, `analytics/`, `compliance/`, `validation/`, `utils/` |
| `lib/platform/polyfills/` | `bigint-json` for JSON serialization |
| `constants.ts` | Shared limits (e.g. `MAX_FILE_SIZE`) |

## Chain JSON-RPC

Relayer, cron, and indexer traffic use [`lib/platform/chain-rpc.ts`](lib/platform/chain-rpc.ts) + [`@filosign/shared` `chain-rpc`](../../packages/shared/chain-rpc.ts).

| `DEPLOYMENT` | Behavior |
|--------------|----------|
| `local` | Hardhat `127.0.0.1:8545` |
| `staging`, `sandbox` | Public Base Sepolia (`sepolia.base.org`) — `CHAIN_RPC_URL` ignored |
| `production` | Optional `CHAIN_RPC_URL` → primary + fallback to public URL for `CHAIN` (`mainnet` or `testnet`); unset → public only |

Startup logs `rpc`, `rpcDedicatedPrimary`, and `rpcPublicFallback` when fallback is enabled. Repeated primary RPC failures emit `server.rpc_degraded` (Telegram + PostHog mirror) with 5-minute dedupe.

## Session

- **`DRAGONFLY_URL`** (required) — `docker compose -f deploy/compose.dev.yml up -d` → `redis://127.0.0.1:6379`
- Client: thirdweb `useAuthToken()` → `Authorization: Bearer` + `X-Wallet-Address` on `/api/rpc`
- **`tx.processIndexerHash`:** `{ hash, body? }` — **`body: {}`** ok for registry relay txs (`zIndexerTxBody`).

## Observability (three layers)

| Layer | Tool | What it covers |
|-------|------|----------------|
| User toasts + help | `@filosign/errors` | Expected API errors (`appCode`), validation |
| **Exceptions / crashes** | **PostHog Issues** | Unexpected throws (see below) |
| **Ops signals** | **Telegram** | Cron/DB/relay/bootstrap alerts |

Do not conflate them: a `BAD_REQUEST` with `appCode` is for the user, not PostHog Issues.

## Analytics (PostHog)

Server-side product events via [`lib/platform/analytics/posthog.ts`](lib/platform/analytics/posthog.ts) (`posthog-node`). Set `POSTHOG_HOST`, `POSTHOG_ENABLED`, and `POSTHOG_API_KEY` in `.env.local`. Full event catalog and funnel guidance: [`project/posthog-integration.md`](../../project/posthog-integration.md).

### Error tracking (server)

- **`captureServerException`** — unexpected errors only (`shouldCaptureServerException` in [`should-capture-exception.ts`](lib/platform/analytics/should-capture-exception.ts)).
- **Primary capture:** oRPC base middleware on [`api/orpc/procedures.ts`](api/orpc/procedures.ts) (`/api/rpc`).
- **Secondary:** Hono `app.onError` (non-oRPC routes) and integrations webhook `catch`.
- Properties are scrubbed via [`@filosign/shared` `analytics-scrub`](../../packages/shared/analytics-scrub.ts) (no emails, keys, ciphertext).
- Skips: `ORPCError` with `data.appCode`, and expected codes (`UNAUTHORIZED`, `BAD_REQUEST`, …).

## Platform alerts (Telegram)

Critical platform failures emit via [`lib/platform/analytics/platform-alerts.ts`](lib/platform/analytics/platform-alerts.ts) using [`@filosign/logger`](../../packages/logger) (Telegram transport). Requires `TG_ANALYTICS_BOT_TOKEN` and `TG_ANALYTICS_BOT_GROUP_ID`; delivery is gated by `TG_ANALYTICS=true`.

When `POSTHOG_ENABLED=true` (with `POSTHOG_HOST` and `POSTHOG_API_KEY`), the same alert is mirrored as a sanitized `platform_alert` PostHog event with the same 5-minute dedupe as Telegram. See [`platform-alert-posthog.ts`](lib/platform/analytics/platform-alert-posthog.ts) and [`project/posthog-integration.md`](../../project/posthog-integration.md).

**Manual staging verification** (not run in CI):

1. Set `TG_ANALYTICS=true` plus valid bot token and group id in Infisical **staging**.
2. Trigger a known 5xx (or wait for a real failure) — expect one Telegram message.
3. Repeat the same failure within 5 minutes — expect dedupe (no spam).
4. Set `TG_ANALYTICS=false` and restart — expect no new messages.

Unit tests: `bun test tests/` in this package; see [TESTING.md](../../TESTING.md) and `tests/platform/` for platform alerts.

Domain modules that read `db.schema` should do so at **call time** (inside functions), not at module import, so `mock.module("@/lib/platform/db")` in tests is not pinned to a stale schema snapshot.

## Ops

- **Dokploy / Docker** — image uses [`scripts/infisical-entrypoint.sh`](scripts/infisical-entrypoint.sh); set bootstrap vars per [`SECRETS.md`](SECRETS.md). Do not paste app secrets into Dokploy env UI.
- **`GET /health`** (root app, not under `/api`) — `{ ok: true }` for probes.
- **Dodo billing webhook** — `POST /api/integrations/dodo/webhook` (Standard Webhooks signature headers: `webhook-id`, `webhook-timestamp`, `webhook-signature`). Stored idempotently in `billing_webhook_events`, then upserts `user_subscriptions`.
- **`bun run db -- purge local|staging|sandbox`** (repo root) — drops `public` schema; local/staging then **push**, sandbox then **migrate** (`production` purge blocked).
- **Schema:** [`drizzle/`](drizzle/) versioned SQL. **Local/staging:** `push` (no generate). **Sandbox/production:** `db:generate` → commit → `migrate` only. Drift check: `bun run db:schema:check`. See [SCRIPTS.md](../../SCRIPTS.md).
- **Invite expiry** — `INVITE_TTL_DAYS` in env (default `7`). All invite types set `expiresAt` at creation via [`inviteExpiresAt()`](lib/domains/invites/ttl.ts): `file_cold_invites`, `user_invites`, `organization_invites`. Hourly `Bun.cron` in [`lib/platform/cron/`](lib/platform/cron/) marks overdue `pending` rows `expired`; handlers use `pending*InviteFilter()` immediately after expiry. PostHog: `cold_invite_expired` for document invites.
- **Settlements** — `file_settlement_rules` stores on-chain payout rules (`legs` jsonb, status, tx hashes). Indexing path: client `registerRule` + `approve` on-chain, then **`settlements.registerForFile`** (not `files.register`). After each signature the server attempts `executePayout` for executable rules. Sign page **Settle payment** → `settlements.trySettle` (server relay + chain sync). **Settle from wallet** → `settlements.confirmSettlement` (hash + `rules()` sync, no receipt RPC). **Teams Pro:** `settlements.updateRule` / `settlements.cancelRule` after on-chain `updatePayoutRule` / `cancelPayoutRule`. Daily `sync-settlement-rules` cron backfills `executed` from chain. oRPC: `settlements.listByFile`, `settlements.registerForFile`, `settlements.trySettle`, `settlements.confirmSettlement`, `settlements.updateRule`, `settlements.cancelRule`. **`files.amendSigner`** — sender-only on-chain signer commitment swap. Compliance bundles are **version 7** (`onchainRegistration`, multi-leg `settlements[]`, `signer_amended` tx kind). See [`project/settlements/architecture-and-non-custody.md`](../../project/settlements/architecture-and-non-custody.md).

## API envelope

JSON API is **`/api/rpc`** — native outputs + **`ORPCError`** mapping. OpenAPI explorer: **`/api/api-reference`**. Avatar flow: **`storage.presignPut`** + browser **`fetch` PUT** to storage, then **`users.profile.update`** with **`avatarKey`**. **`runtime`** stays on **`rpc.runtime`**.

Billing oRPC (two rails):
- **Wallet (Solo):** `user_subscriptions` — `billing.getUserSummary`, `billing.createCheckoutSession` (`individual` only), `billing.createPortalSession`.
- **Workspace (Teams / Teams Pro):** `organization_subscriptions` — `billing.getOrgSummary`, `billing.getWorkspaceBillingContext`, `billing.createOrgCheckoutSession`, `billing.changeOrgPlan`, seat preview/update, org portal.
- **Upgrade UX:** `billing.getUpgradeOfferings` (feature gate + current plans → selectable checkout paths).
- **Marketing:** `billing.previewMarketingCheckout` (public) then `billing.requestCheckoutLink`; preflight blocks duplicate Solo / paid workspace checkout for known emails.

Billing security notes:
- `billing.createCheckoutSession` rejects `teams` / `teams_pro` (use org checkout). `createOrgCheckoutSession` is org-scoped.
- `billing.createCheckoutSession` validates `returnUrl` origin against `CLIENT_URL` plus optional `BILLING_RETURN_URL_ORIGINS`.
- Webhook processing is idempotent by `webhook-id` with event status (`received`/`processed`/`failed`) in `billing_webhook_events`.

## Security notes

- **`tx.processIndexerHash`** — **`authenticatedProcedure`** (thirdweb session). Reverted txs → **400**.
- **`DEBUG=true`** — verbose request/indexer logging (does not affect email).
- **`RESEND_ENABLED=false`** — skip all outbound product email (default `true`).
- **Email delivery** — Resend primary via [`lib/platform/email/deliver.ts`](lib/platform/email/deliver.ts); optional SES fallback when `SES_ENABLED` + `SES_REGION` + `SES_FROM_EMAIL` are set (retryable Resend failures only). See [`SECRETS.md`](SECRETS.md).

## Object storage (S3-compatible / R2)

- **Private-first:** Handlers omit **`acl: public-read`** on **`presign` PUT**. Avatars use **`storage.presignPut`** (`kind: webp_user_avatar`) plus **`bucket.exists`** validation before **`users.profile.update`**. Reads expose bytes via **`presigned GET`** (e.g. `userProfile.me`, lookups, file piece URLs).

- **CORS:** Bucket / R2 dashboard must allow browser **`PUT`** (and **`GET`** if validating) from your **`apps/client`** origin(s); the upload host matches **`S3_ENDPOINT`** / configured public hostname.

## Database

- **Drizzle** uses **`pg.Pool`** in `lib/platform/db/client.ts`; tune **`max`** / **`idleTimeoutMillis`** for your Postgres limits.
- Push schema (local/staging): `bun run db -- push local|staging` (from repo root)
- Purge (destructive): `bun run db -- purge local|staging|sandbox`

## Checks

- `bun run check` — Biome
- `bun run check-types` — TypeScript
- **`bun test`** — unit tests under [`tests/`](tests/) (domains, platform, support mocks)
