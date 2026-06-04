# Postgres backups & PITR (pgBackRest → R2)

Off-VPS backups for the Filosign Postgres instance. **Supavisor/PgBouncer** is unrelated (connection pooling only).

## Prerequisites

- Postgres **18** (compose: `postgres:18-alpine`) with writable volume at `/var/lib/postgresql` (`PGDATA` = `/var/lib/postgresql/18/docker`)
- Cloudflare R2 bucket (S3-compatible), **not** on the same disk as `PGDATA`
- Infisical `prod` / staging secrets (never commit keys)

## Environment variables

| Variable | Example | Notes |
|----------|---------|--------|
| `PGBACKREST_RETENTION_DAYS` | `30` | Maps to `repo1-retention-full-time=30d` in config |
| `PGBACKREST_REPO_S3_BUCKET` | `filosign-pg-backups` | Dedicated backup bucket |
| `PGBACKREST_REPO_S3_ENDPOINT` | `https://<account>.r2.cloudflarestorage.com` | R2 S3 API endpoint |
| `PGBACKREST_REPO_S3_KEY` | — | R2 access key id |
| `PGBACKREST_REPO_S3_KEY_SECRET` | — | R2 secret |
| `PGBACKREST_CIPHER_PASS` | — | Encrypt backup repo at rest |

Optional: R2 bucket lifecycle rule to delete objects after 30 days (belt-and-suspenders).

## Postgres configuration

Mount or inject `postgresql.conf` fragments:

```ini
archive_mode = on
wal_level = replica
max_wal_size = 1GB
archive_command = 'pgbackrest --stanza=filosign archive-push %p'
max_wal_senders = 3
```

Restart Postgres once when enabling archiving (maintenance window).

### WAL / disk exhaustion

If `archive-push` fails (R2 outage, bad credentials, rate limits), Postgres **retains WAL** until archive succeeds. Monitor:

- **PGDATA volume usage** (alert > 80%)
- pgBackRest `archive-push` / `check` exit codes

**Runbook:** fix R2 credentials or connectivity → `pgbackrest --stanza=filosign check` → confirm archives resume. If disk is full, restore from last good backup after freeing space or expanding volume — do not delete WAL manually without ops review.

## pgBackRest configuration template

`/etc/pgbackrest/pgbackrest.conf` (sidecar or host):

```ini
[global]
repo1-type=s3
repo1-s3-endpoint=<PGBACKREST_REPO_S3_ENDPOINT>
repo1-s3-bucket=<PGBACKREST_REPO_S3_BUCKET>
repo1-s3-key=<from-infisical>
repo1-s3-key-secret=<from-infisical>
repo1-s3-region=auto
repo1-s3-uri-style=path
repo1-retention-full-type=time
repo1-retention-full-time=30d
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=<from-infisical>

[filosign]
pg1-path=/var/lib/postgresql/18/docker
pg1-user=filosign
pg1-database=filosign
```

**R2 requires `repo1-s3-uri-style=path`** — virtual-hosted style (`bucket.endpoint`) fails.

## One-time stanza setup

All pgBackRest commands on **`filosign-postgres`** (`compose.data.yml` — no sidecar; `pg1-host` over Docker DNS implies SSH and fails without keys).

```bash
docker exec filosign-postgres pgbackrest --stanza=filosign stanza-create
docker exec filosign-postgres pgbackrest --stanza=filosign check
docker exec filosign-postgres pgbackrest --stanza=filosign backup --type=full
docker exec filosign-postgres ls -la /var/lib/pgbackrest/archive/filosign/
```

Local dev (`compose.dev-full.yml`) may still use a **pgbackrest sidecar** with shared `postgres_data` and **no** `pg1-host` in `pgbackrest.conf` — see [`pgbackrest.conf.example`](../../deploy/pgbackrest/pgbackrest.conf.example).

Until `stanza-create` succeeds, postgres logs repeat `[103] … has a stanza-create been performed?` — the DB still accepts connections.

## Schedules (host cron or Dokploy job)

| Job | Schedule (UTC) | Command |
|-----|----------------|---------|
| Full | Sun 03:00 | `pgbackrest --stanza=filosign backup --type=full` |
| Diff | Daily 03:30 | `pgbackrest --stanza=filosign backup --type=diff` |
| Check | Daily 04:00 | `pgbackrest --stanza=filosign check` |

Use [`deploy/scripts/pgbackrest-backup.sh`](../../deploy/scripts/pgbackrest-backup.sh) — on non-zero exit it runs [`apps/server/scripts/pgbackrest-failure-alert.ts`](../../apps/server/scripts/pgbackrest-failure-alert.ts) (`server.pgbackrest_failed` → Telegram when `TG_ANALYTICS=true`). Verify in [production smoke test #7](production-smoke-tests.md).

## PITR restore drill (staging first)

1. Stop API + worker writes.
2. `pgbackrest --stanza=filosign --type=time "--target=YYYY-MM-DD HH:MM:SS+00" restore`
3. Start Postgres; verify row counts and `drizzle` migration journal.
4. Re-run quarterly.

## Before sandbox / production `drizzle-kit migrate`

1. `pgbackrest --stanza=filosign backup --type=full` immediately before migrate (production).
2. `db:generate` + commit `apps/server/drizzle/`; apply via `bun run db -- migrate sandbox` then `migrate production`.
3. Local/staging may use `push` for iteration; do not `push` sandbox or production.
4. On failure: PITR to timestamp before migrate — not `drizzle-kit push`.

## Local proof (Sprint 0)

See [`deploy/compose.dev-full.yml`](../../deploy/compose.dev-full.yml) and [`deploy/README.md`](../../deploy/README.md).

## App connection

`PG_URI` / `DATABASE_URL` point at Postgres directly — **not** through pgBackRest.
