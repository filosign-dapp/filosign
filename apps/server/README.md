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
| `api/routes/router.ts` | **`optionalJwtWalletForOrpc`** + hybrid oRPC mount (thin shell) |
| `api/middleware/` | JWT optional parsing for **`/api/rpc`** + **`/api/api-reference`** |
| `lib/domain/` | Cross-cutting domain logic (oRPC handlers + indexer), e.g. sharing invites, file-invite helpers |
| `lib/indexer/` | `processTransaction` — replays receipts into DB |
| `lib/validation/` | E.g. `tx-registration.ts` — Zod schemas shared with indexer / RPC |
| `lib/polyfills/` | `bigint-json` for JSON serialization |
| `constants.ts` | Shared limits (e.g. `MAX_FILE_SIZE`) |

## Scaling / limits

- **Auth (`auth.nonce`):** nonces are **in-process** (`Record<Address, …>`). Safe for **one server process**. For **multiple replicas**, use Redis/Postgres or redesign the Dilithium handshake.
- **`tx.processIndexerHash` input `{ hash, body? }`:** **`body: {}`** is valid for txs that only index FSManager logs; **`encryptionPublicKey` + `signaturePublicKey`** together (hex) for KeyRegistry registration. Shape is **`zIndexerTxBody`** in `lib/validation/tx-registration.ts`.

## Analytics (PostHog)

Server-side product events via `lib/analytics/` (`posthog-node`). Set `POSTHOG_ENABLED`, `POSTHOG_API_KEY` in `.env.local`. Full event catalog and funnel guidance: [`ANALYTICS.md`](../../ANALYTICS.md).

## Ops

- **`GET /health`** (root app, not under `/api`) — `{ ok: true }` for probes.
- **`bun run routes:print`** — lists mounted Hono routes (`scripts/print-routes.ts`).
- **Cold invite expiry** — run `bun run jobs:expire-cold-invites` (or `bun run --cwd apps/server jobs:expire-cold-invites`) on a schedule (e.g. hourly cron). Marks `file_cold_invites` with `status = pending` and `expires_at < now()` as `expired`; logs `{ expiredCount }` and emits a batched PostHog `cold_invite_expired` when analytics is enabled.

## API envelope

JSON API is **`/api/rpc`** — native outputs + **`ORPCError`** mapping. OpenAPI explorer: **`/api/api-reference`**. Avatar flow: **`storage.presignPut`** + browser **`fetch` PUT** to storage, then **`users.profile.update`** with **`avatarKey`**. **`runtime`** stays on **`rpc.runtime`**.

## Security notes

- **`tx.processIndexerHash`** uses **`authenticatedProcedure`** — JWT unchanged. Validates JSON server-side; **reverted** on-chain txs return **400**. Generic **500** text avoids leaking internals; see `ProcessTxUserError`.
- **`DEBUG=true`** — skips outbound Resend email (`lib/email/invites.ts`) and expands JWT indexer logs (`env.ts` drives both).

## Object storage (S3-compatible / R2)

- **Private-first:** Handlers omit **`acl: public-read`** on **`presign` PUT**. Avatars use **`storage.presignPut`** (`kind: webp_user_avatar`) plus **`bucket.exists`** validation before **`users.profile.update`**. Reads expose bytes via **`presigned GET`** (e.g. `userProfile.me`, lookups, file piece URLs).

- **CORS:** Bucket / R2 dashboard must allow browser **`PUT`** (and **`GET`** if validating) from your **`apps/client`** origin(s); the upload host matches **`S3_ENDPOINT`** / configured public hostname.

## Database

- **Drizzle** uses **`pg.Pool`** in `lib/db/client.ts`; tune **`max`** / **`idleTimeoutMillis`** for your Postgres limits.
- Push schema (dev): `bun run db -- push local` or `bun run db -- push testnet` (from repo root)
- Purge (destructive): `bun run db -- purge local|testnet`

## Checks

- `bun run check` — Biome
- `bun run check-types` — TypeScript
- **`bun test`** — Zod/helpers unit tests (`lib/**/*.test.ts`)
