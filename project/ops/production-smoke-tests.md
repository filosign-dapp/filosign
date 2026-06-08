# Production smoke tests (Sprint 6)

**Purpose:** Prove Sprints 0–5 mitigations on **staging** before production traffic.  
**Prereqs:** Staging VPS per [`dokploy-deploy.md`](dokploy-deploy.md), [`vps-host-setup.md`](vps-host-setup.md), `TG_ANALYTICS=true` for alert scenarios 7–8.

**Related:** [`job-idempotency.md`](job-idempotency.md) · [`postgres-ops.md`](postgres-ops.md) · [`dragonfly-bullmq-production.md`](dragonfly-bullmq-production.md) · [`deploy/README.md`](../../deploy/README.md) (api/worker env parity)

---

## Sign-off checklist (staging)

Run on the **staging** stack. Record date, operator, and pass/fail. Do not enable production traffic until all rows pass.

| # | Scenario | Pass | Date | Operator | Notes |
|---|----------|:----:|------|----------|-------|
| 1 | Outbox email idempotency | ☐ | | | |
| 2 | Dodo checkout → dashboard plan | ☐ | | | |
| 3 | Payout worker SIGTERM mid-job | ☐ | | | |
| 4 | trySettle vs queued payout | ☐ | | | |
| 5 | Dragonfly restart | ☐ | | | |
| 6 | pgBackRest PITR restore drill | ☐ | | | |
| 7 | Backup cron failure alert | ☐ | | | |
| 8 | BullMQ terminal failure alert | ☐ | | | |

**Sign-off:** _________________________ **Date:** ___________

---

## Scenario 1 — Register → outbox → email (no duplicate send)

**Proves:** Outbox idempotency + drainer; no duplicate provider sends.

**Steps:**

1. Register/send an envelope to a test inbox you control (staging).
2. Confirm one row in `job_outbox` (`processed_at` null then set).
3. Note `idempotency_key`; confirm one BullMQ job:  
   `docker exec <dragonfly> redis-cli KEYS '*email*'` or Bull Board if enabled.
4. **Run drainer twice** without waiting for natural 15s tick:  
   `docker exec <worker> …` or trigger `runOutboxDrainerTick` via ops shell; or restart worker twice within 30s.
5. Re-run sweeper cron window (optional): wait 5+ min or invoke `runOutboxSweeperJob`.

**Expected:**

- Exactly **one** delivery email (check inbox + SES/Resend logs).
- `job_outbox.processed_at` set once; `last_error` null.
- Second drainer/sweeper pass does not enqueue a second active job for the same `idempotency_key`.

---

## Scenario 2 — Dodo test webhook → dashboard plan (no hard refresh)

**Proves:** Fast webhook ack, entitlement cache invalidation, **client** billing refetch after checkout return.

**Steps:**

1. Complete Dodo **test** checkout for a workspace (return URL → `/dashboard` or workspace billing).
2. Without manual browser hard-refresh, open dashboard and workspace billing.
3. Confirm plan/seat limits match webhook (e.g. Teams, seat count).

**Expected:**

- Webhook returns 200 quickly; `billing_webhook_events.status` → `processed`.
- Dashboard shows new plan within one navigation (shell mount invalidates `billing.entitlements` + org summary).
- Smoke test #2 fails if user must Cmd+Shift+R to see the plan.

---

## Scenario 3 — Post-sign payout + SIGTERM mid-job

**Proves:** Payout queue + relayer lock; graceful worker shutdown; no double on-chain leg.

**Steps:**

1. File with settlement rules; complete signing so payout enqueues.
2. While payout worker is active, `docker kill -s TERM <worker-container>` (or `kill -TERM` on worker PID).
3. Inspect `file_settlement_rules` / leg rows and chain (MockUSDC transfers / explorer).

**Expected:**

- No duplicate payout tx for the same leg (same `on_chain_rule_id` / leg index).
- DB leg status `partial` or `executed` consistent with chain (not two `executed` for one leg).
- Worker exits cleanly (logs: workers closed); job may retry on next worker start without double-spend.

---

## Scenario 4 — trySettle while payout job queued

**Proves:** Relayer lock + DB gates across trySettle and payout worker.

**Steps:**

1. Same piece as scenario 3; enqueue payout (post-sign).
2. Before payout finishes, invoke **Settle payment** (`settlements.trySettle`) from sign UI or RPC.
3. Watch logs for relayer lock and worker ordering.

**Expected:**

- No nonce / replacement errors on relayer.
- At most one successful on-chain execution per leg; other path no-ops or waits on lock.

---

## Scenario 5 — `docker restart` Dragonfly

**Proves:** Persistence + job resume after broker bounce.

**Steps:**

1. Enqueue a non-critical test job (e.g. indexer with known hash) or leave email job waiting.
2. `docker restart <dragonfly-container>`.
3. Confirm worker reconnects; job completes or drainer re-enqueues stale outbox per sweeper.

**Expected:**

- API/worker boot without permanent Redis errors.
- Queued work eventually completes; session cache repopulates on next request.

---

## Scenario 6 — pgBackRest restore to clone DB + app boot

**Proves:** PITR / restore path documented in [`postgres-ops.md`](postgres-ops.md).

**Steps:**

1. Note UTC time `T0`; create write (e.g. test org name).
2. Stop Postgres; restore to `T0` (or latest backup on clone volume).
3. Start Postgres clone; point **staging clone** `PG_URI` at restored DB; boot API once.

**Expected:**

- `SELECT 1` succeeds; app boots; data at restore point (write after `T0` absent if time-targeted).

---

## Scenario 7 — Backup cron failure → Telegram alert

**Proves:** [`deploy/scripts/pgbackrest-backup.sh`](../../deploy/scripts/pgbackrest-backup.sh) non-zero exit → platform alert.

**Steps:**

1. Ensure `TG_ANALYTICS=true` and bot token/chat on **host or sidecar** running cron.
2. Simulate failure:  
   `PGBACKREST_CONTAINER=nonexistent ./deploy/scripts/pgbackrest-backup.sh check`  
   (expect exit 1).
3. Or run wrapper with invalid stanza on purpose in staging maintenance window.

**Expected:**

- Script exits non-zero.
- One Telegram (deduped 5 min) `server.pgbackrest_failed` with stanza/container/cmd in context.
- PostHog `platform_alert` mirror if `POSTHOG_ENABLED=true`.

---

## Scenario 8 — BullMQ terminal failure → log + Telegram

**Proves:** Failed handler after retries exhausted.

**Steps:**

1. On staging worker, temporarily break email handler (invalid SES creds) **or** add a one-off job with failing processor in maintenance window.
2. Let job exhaust `attempts` (default 5).
3. Check worker logs + Telegram.

**Expected:**

- `bullmq job failed (DLQ / retries exhausted)` log once per terminal failure (not per retry).
- Telegram `server.bullmq_job_failed` with `queueName`, `jobId`, `error`.

---

## Out of scope (this gate)

- GDPR / retention policy
- Second Dragonfly instance
- `documents.list` tab=all SQL union (in-memory merge pagination ships in app)
- PgBouncer / multi-replica API

---

## GDPR migration preflight + rollout

Run these checks before the **first** `bun run prod -- --migrate` on a database (squashed schema in `apps/server/drizzle/0000_initial.sql`). See [postgres-ops.md](postgres-ops.md) if prod still has a partial old schema — reset public schema first.

### Preflight SQL checks

```sql
-- 1) Orphan signatures that would block FK on user_signatures.wallet_address
SELECT us.*
FROM user_signatures us
LEFT JOIN users u ON u.wallet_address = us.wallet_address
WHERE u.wallet_address IS NULL;

-- 2) Files/org integrity before ON DELETE RESTRICT rollout
SELECT f.organization_id, COUNT(*) AS file_count
FROM files f
LEFT JOIN organizations o ON o.id = f.organization_id
WHERE o.id IS NULL
GROUP BY f.organization_id;
```

Expected: both queries return 0 rows.

### Rollout sequence

1. Run preflight SQL in staging.
2. Apply migration in staging.
3. Run `bun run check` and smoke-test sign/send/list paths.
4. Verify deletes on organizations with files now fail (restrict guardrail).
5. Repeat preflight SQL in production.
6. Apply migration in production during low-traffic window.
7. Re-run smoke checks and monitor cron + API error logs for 24h.
