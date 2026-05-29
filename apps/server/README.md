# @filosign/server

Hono API, Drizzle/Postgres, thirdweb auth verification, S3, and chain/indexer helpers for Filosign.

## Run

- Local: `bun run dev:local` (`.env.local` via `--env-file`)
- Staging: `bun run dev:staging` (Infisical `staging`; `infisical login` first)
- Sandbox: `bun run dev:sandbox` (Infisical `sandbox`)

Secrets layout: [`SECRETS.md`](SECRETS.md). Local server uses **`--env-file`**; staging/prod server uses **`infisical run`** (contracts keep `apps/contracts/.env.*`).

## Structure

| Path | Role |
|------|------|
| `api/integrations/` | Partner webhooks — before session middleware |
| `api/orpc/` | oRPC **`/api/rpc`** + OpenAPI **`/api/api-reference`** (see `hono-mount.ts`, `router.ts`) |
| `api/handlers/` | oRPC procedure implementations (**`ORPCError`**, reuse `tryCatch`) |
| `api/orpc/hono-mount.ts` | **`apiRouter`** — integrations, then optional thirdweb Bearer + oRPC on `/api` |
| `lib/platform/cache/session-cache.ts` | Dragonfly: thirdweb session cache + verify rate limit |
| `lib/domains/` | Business logic by bounded context (orgs, files, settlements, sharing, users, entitlements, invites, runtime) — shared by handlers, indexer, cron |
| `lib/platform/` | Shared infra: `db/`, `indexer/`, `cron/`, `evm`, `s3/`, `analytics/`, `compliance/`, `validation/`, `utils/` |
| `lib/platform/polyfills/` | `bigint-json` for JSON serialization |
| `constants.ts` | Shared limits (e.g. `MAX_FILE_SIZE`) |

## Session

- **`DRAGONFLY_URL`** (required) — `docker compose up -d` → `redis://127.0.0.1:6379`
- Client: thirdweb `useAuthToken()` → `Authorization: Bearer` + `X-Wallet-Address` on `/api/rpc`
- **`tx.processIndexerHash`:** `{ hash, body? }` — **`body: {}`** ok for registry relay txs (`zIndexerTxBody`).

## Analytics (PostHog)

Server-side product events via `lib/analytics/` (`posthog-node`). Set `POSTHOG_ENABLED`, `POSTHOG_API_KEY` in `.env.local`. Full event catalog and funnel guidance: [`ANALYTICS.md`](../../ANALYTICS.md).

## Platform alerts (Telegram)

Critical platform failures emit via [`lib/platform/analytics/platform-alerts.ts`](lib/platform/analytics/platform-alerts.ts) using [`@filosign/logger`](../../packages/logger) (Telegram transport). Requires `TG_ANALYTICS_BOT_TOKEN` and `TG_ANALYTICS_BOT_GROUP_ID`; delivery is gated by `TG_ANALYTICS=true`.

**Manual staging verification** (not run in CI):

1. Set `TG_ANALYTICS=true` plus valid bot token and group id in Infisical **staging**.
2. Trigger a known 5xx (or wait for a real failure) — expect one Telegram message.
3. Repeat the same failure within 5 minutes — expect dedupe (no spam).
4. Set `TG_ANALYTICS=false` and restart — expect no new messages.

Unit tests: `bun test tests/` in this package; see [TESTING.md](../../TESTING.md) and `tests/platform/` for platform alerts.

## Ops

- **Dokploy / Docker** — image uses [`scripts/infisical-entrypoint.sh`](scripts/infisical-entrypoint.sh); set bootstrap vars per [`SECRETS.md`](SECRETS.md). Do not paste app secrets into Dokploy env UI.
- **`GET /health`** (root app, not under `/api`) — `{ ok: true }` for probes.
- **Dodo billing webhook** — `POST /api/integrations/dodo/webhook` (Standard Webhooks signature headers: `webhook-id`, `webhook-timestamp`, `webhook-signature`). Stored idempotently in `billing_webhook_events`, then upserts `user_subscriptions`.
- **`bun run db -- purge local|staging|sandbox`** (repo root) — drops/recreates Postgres `public` schema, then drizzle push (`production` purge blocked).
- **Invite expiry** — `INVITE_TTL_DAYS` in env (default `7`). All invite types set `expiresAt` at creation via [`inviteExpiresAt()`](lib/domains/invites/ttl.ts): `file_cold_invites`, `user_invites`, `organization_invites`. Hourly `Bun.cron` in [`lib/platform/cron/`](lib/platform/cron/) marks overdue `pending` rows `expired`; handlers use `pending*InviteFilter()` immediately after expiry. PostHog: `cold_invite_expired` for document invites.
- **Settlements** — `file_settlement_rules` tracks on-chain payout rules (status, tx hashes). After each signature the server attempts `executePayout` for executable rules. Sign page **Settle payment** calls `settlements.trySettle` (server relay + chain sync). **Settle from wallet** uses `settlements.confirmSettlement` (hash + `rules()` sync, no receipt RPC). Daily `sync-settlement-rules` cron backfills `executed` from chain for off-platform payouts. oRPC: `settlements.listByFile`, `settlements.trySettle`, `settlements.confirmSettlement`. Compliance bundles are **version 4** and include `settlements[]`. See [`project/settlements/architecture-and-non-custody.md`](../../project/settlements/architecture-and-non-custody.md).

## API envelope

JSON API is **`/api/rpc`** — native outputs + **`ORPCError`** mapping. OpenAPI explorer: **`/api/api-reference`**. Avatar flow: **`storage.presignPut`** + browser **`fetch` PUT** to storage, then **`users.profile.update`** with **`avatarKey`**. **`runtime`** stays on **`rpc.runtime`**.

Billing oRPC:
- `billing.entitlements`
- `billing.createCheckoutSession` (returns hosted `checkoutUrl`)
- `billing.createPortalSession` (returns hosted portal URL for existing Dodo customer)

Billing security notes:
- `billing.createCheckoutSession` validates `returnUrl` origin against `CLIENT_URL` plus optional `BILLING_RETURN_URL_ORIGINS`.
- Webhook processing is idempotent by `webhook-id` with event status (`received`/`processed`/`failed`) in `billing_webhook_events`.

## Security notes

- **`tx.processIndexerHash`** — **`authenticatedProcedure`** (thirdweb session). Reverted txs → **400**.
- **`DEBUG=true`** — skips Resend email; verbose indexer logs.

## Object storage (S3-compatible / R2)

- **Private-first:** Handlers omit **`acl: public-read`** on **`presign` PUT**. Avatars use **`storage.presignPut`** (`kind: webp_user_avatar`) plus **`bucket.exists`** validation before **`users.profile.update`**. Reads expose bytes via **`presigned GET`** (e.g. `userProfile.me`, lookups, file piece URLs).

- **CORS:** Bucket / R2 dashboard must allow browser **`PUT`** (and **`GET`** if validating) from your **`apps/client`** origin(s); the upload host matches **`S3_ENDPOINT`** / configured public hostname.

## Database

- **Drizzle** uses **`pg.Pool`** in `lib/platform/db/client.ts`; tune **`max`** / **`idleTimeoutMillis`** for your Postgres limits.
- Push schema (dev): `bun run db -- push local|staging|sandbox|production` (from repo root)
- Purge (destructive): `bun run db -- purge local|staging|sandbox`

## Checks

- `bun run check` — Biome
- `bun run check-types` — TypeScript
- **`bun test`** — unit tests under [`tests/`](tests/) (domains, platform, support mocks)
