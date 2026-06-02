# BullMQ job idempotency (Filosign)

BullMQ delivers **at least once**. Handlers must be safe to re-run.

## Layers

| Layer | Mechanism | Fixes |
|-------|-----------|--------|
| Enqueue | Stable `jobId` | Duplicate adds collapse when job still in queue |
| Handler | Postgres status / unique constraints | Duplicate runs no-op |
| Provider | Resend/SES idempotency keys (email) | Duplicate sends suppressed |

**Outbox** (email) prevents “committed in DB but never enqueued”. It does **not** prevent duplicate job execution.

## Stable job IDs

| Queue | `jobId` pattern |
|-------|-----------------|
| `email` | `{idempotencyKey}` (same as `job_outbox`) |
| `payout-execution` | `payout__{pieceCid}` |
| `transaction-indexing` | `indexer__{txHash}` |
| `billing-webhook` | `billing__{webhook-id}` |

BullMQ custom `jobId` must not contain `:` (use `__` between namespace and key).

## Handler gates

| Worker | Gate |
|--------|------|
| **billing-webhook** | `billing_webhook_events.status === 'processed'` → return |
| **payout-execution** | Settlement leg / rule status before `sendTransaction` (see `execute-payout.ts`) |
| **email** | `job_outbox.processed_at` + provider idempotency key |
| **transaction-indexing** | Receipt wait is safe to repeat for same hash |

## Dodo webhook UX

1. API: verify → insert `received` → **`invalidateOrgEntitlements(orgId)`** → enqueue → **200**
2. Worker: full sync → invalidate again

Without step 1, checkout redirect can read stale entitlements from cache.

## Relayer

All `FC_SERVER` writes use `withRelayerLock` (Redis `fs:lock:relayer:{address}`, token + Lua release). Payout worker concurrency = **1**; still use lock for API `trySettle` and deploy overlap.

## Partial multi-leg payout

`file_settlement_rules.status` may be `partial`. Retries must re-read DB before each leg.

## Queue retention

Default: `removeOnComplete` 24h, `removeOnFail` 7d, 5 attempts exponential backoff. See `lib/platform/jobs/queue-defaults.ts`.
