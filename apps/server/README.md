# @filosign/server

Hono API, Drizzle/Postgres, thirdweb auth verification, S3, and chain/indexer helpers for Filosign.

## Run

- Local: `bun run dev:local` (loads `.env.local`)
- Staging/testnet profile: `bun run dev:testnet` (loads `.env.staging`)

Bun reads `.env*` automatically per [environment variables — Bun](https://bun.com/docs/runtime/environment-variables); workspace scripts pin files with **`--env-file`** for predictable local/staging.

## Structure

| Path | Role |
|------|------|
| `api/orpc/` | oRPC **`/api/rpc`** + OpenAPI **`/api/api-reference`** (see `hono-mount.ts`, `router.ts`) |
| `api/handlers/` | oRPC procedure implementations (**`ORPCError`**, reuse `tryCatch`) |
| `api/orpc/hono-mount.ts` | **`apiRouter`** — optional JWT + hybrid oRPC/OpenAPI on `/api` |
| `api/middleware/` | JWT optional parsing for **`/api/rpc`** + **`/api/api-reference`** |
| `lib/domains/` | Business logic by bounded context (orgs, files, sharing, users, entitlements, invites, runtime) — shared by handlers, indexer, cron |
| `lib/platform/` | Shared infra: `db/`, `indexer/`, `cron/`, `evm`, `s3/`, `analytics/`, `compliance/`, `validation/`, `utils/` |
| `lib/platform/polyfills/` | `bigint-json` for JSON serialization |
| `constants.ts` | Shared limits (e.g. `MAX_FILE_SIZE`) |

## Scaling / limits

- **Auth (`auth.nonce`):** nonces are **in-process** (`Record<Address, …>`). Safe for **one server process**. For **multiple replicas**, use Redis/Postgres or redesign the Dilithium handshake.
- **`tx.processIndexerHash` input `{ hash, body? }`:** **`body: {}`** is valid for txs that only index FSManager logs; **`encryptionPublicKey` + `signaturePublicKey`** together (hex) for KeyRegistry registration. Shape is **`zIndexerTxBody`** in `lib/validation/tx-registration.ts`.

## Analytics (PostHog)

Server-side product events via `lib/analytics/` (`posthog-node`). Set `POSTHOG_ENABLED`, `POSTHOG_API_KEY` in `.env.local`. Full event catalog and funnel guidance: [`ANALYTICS.md`](../../ANALYTICS.md).

## Ops

- **`GET /health`** (root app, not under `/api`) — `{ ok: true }` for probes.
- **`bun run db -- purge local|testnet`** (repo root) — `scripts/clear-db.ts` drops/recreates the Postgres `public` schema, then drizzle push (dev reset).
- **Invite expiry** — `INVITE_TTL_DAYS` in env (default `7`). All invite types set `expiresAt` at creation via [`inviteExpiresAt()`](lib/domains/invites/ttl.ts): `file_cold_invites`, `user_invites`, `organization_invites`. Hourly `Bun.cron` in [`lib/platform/cron/`](lib/platform/cron/) marks overdue `pending` rows `expired`; handlers use `pending*InviteFilter()` immediately after expiry. PostHog: `cold_invite_expired` for document invites.

## API envelope

JSON API is **`/api/rpc`** — native outputs + **`ORPCError`** mapping. OpenAPI explorer: **`/api/api-reference`**. Avatar flow: **`storage.presignPut`** + browser **`fetch` PUT** to storage, then **`users.profile.update`** with **`avatarKey`**. **`runtime`** stays on **`rpc.runtime`**.

## Security notes

- **`tx.processIndexerHash`** uses **`authenticatedProcedure`** — JWT unchanged. Validates JSON server-side; **reverted** on-chain txs return **400**. Generic **500** text avoids leaking internals; see `ProcessTxUserError`.
- **`DEBUG=true`** — skips outbound Resend email (`lib/platform/email/invites.ts`) and expands JWT indexer logs (`env.ts` drives both).

## Object storage (S3-compatible / R2)

- **Private-first:** Handlers omit **`acl: public-read`** on **`presign` PUT**. Avatars use **`storage.presignPut`** (`kind: webp_user_avatar`) plus **`bucket.exists`** validation before **`users.profile.update`**. Reads expose bytes via **`presigned GET`** (e.g. `userProfile.me`, lookups, file piece URLs).

- **CORS:** Bucket / R2 dashboard must allow browser **`PUT`** (and **`GET`** if validating) from your **`apps/client`** origin(s); the upload host matches **`S3_ENDPOINT`** / configured public hostname.

## Database

- **Drizzle** uses **`pg.Pool`** in `lib/platform/db/client.ts`; tune **`max`** / **`idleTimeoutMillis`** for your Postgres limits.
- Push schema (dev): `bun run db -- push local` or `bun run db -- push testnet` (from repo root)
- Purge (destructive): `bun run db -- purge local|testnet`

## Checks

- `bun run check` — Biome
- `bun run check-types` — TypeScript
- **`bun test`** — Zod/helpers unit tests (`lib/**/*.test.ts`)
