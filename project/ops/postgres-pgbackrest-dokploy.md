# Postgres backups & PITR (pgBackRest → R2)

Off-VPS backups for the Filosign Postgres instance. **Supavisor/PgBouncer** is unrelated (connection pooling only).

## Docker on VPS — what actually works

Community + pgBackRest maintainer guidance converges on this pattern ([Data Egret 2025](https://dataegret.com/2025/12/pgbackrest-pitr-in-docker-a-simple-demo/), [pgBackRest #2244](https://github.com/pgbackrest/pgbackrest/issues/2244), [Crunchy permissions](https://www.crunchydata.com/blog/secure-permissions-for-pgbackrest)):

| Do | Don't |
|----|-------|
| **One custom image**: official `postgres:18` + **PGDG `pgbackrest`** | Separate sidecar with `pg1-host=postgres` (defaults to **SSH** → fails in Docker) |
| **`pgbackrest.conf`** for paths, stanza, retention | Scattered `PGBACKREST_*` for everything (hard to debug; retention env quirks on some images) |
| **`archive-push` in the postgres container** (local `pg1-path`) | Host-machine pgBackRest pointing at a bind-mounted volume (unix socket mismatch) |
| **S3/R2 repo** off the VPS disk | POSIX repo on same volume as PGDATA (survives container restart, not disk loss) |
| **`docker exec -u postgres`** for manual commands | `docker exec` as **root** (locks under `/tmp/pgbackrest` → `[041] Permission denied` for archive-push) |
| **`lock-path` on a persistent volume** owned by `postgres` | Default `/tmp/pgbackrest` locks; **`spool-path` without `archive-async=y`** (error [031]) |
| **Test restore** into a fresh volume quarterly | Assume backups work because `stanza-create` succeeded |

Filosign **`compose.data.yml`** implements this: `deploy/postgres/Dockerfile` builds `filosign-postgres-pgbackrest:18` (Postgres + pgBackRest + baked [`pgbackrest.conf`](../../deploy/postgres/pgbackrest.conf)); Dokploy env supplies **S3 secrets only**.

## Prerequisites

- Postgres **18** with writable volume at `/var/lib/postgresql` (`PGDATA` = `/var/lib/postgresql/18/docker`)
- Cloudflare R2 bucket (S3-compatible), **not** on the same disk as `PGDATA`
- Dokploy env for R2 keys + cipher pass (never commit)

## Dokploy environment (secrets only)

| Variable | Notes |
|----------|--------|
| `POSTGRES_PASSWORD` | App DB password |
| `PGBACKREST_REPO1_S3_ENDPOINT` | R2 S3 API endpoint |
| `PGBACKREST_REPO1_S3_BUCKET` | Dedicated backup bucket |
| `PGBACKREST_REPO1_S3_KEY` / `PGBACKREST_REPO1_S3_KEY_SECRET` | R2 access keys |
| `PGBACKREST_REPO1_CIPHER_PASS` | Encrypt repo at rest |

Paths, stanza name, retention, `repo1-s3-uri-style=path` live in the image’s `/etc/pgbackrest/pgbackrest.conf`.

Optional: R2 bucket lifecycle rule to delete objects after 30 days.

## Postgres configuration

[`postgresql.production.conf`](../../deploy/postgres/postgresql.production.conf):

```ini
archive_mode = on
wal_level = replica
max_wal_size = 1GB
archive_command = 'pgbackrest --stanza=filosign archive-push %p'
max_wal_senders = 3
```

### WAL / disk exhaustion

If `archive-push` fails (R2 outage, bad credentials, rate limits), Postgres **retains WAL** until archive succeeds. Monitor PGDATA volume usage (alert > 80%) and pgBackRest exit codes.

**Runbook:** fix R2 → `docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign check` → confirm archives resume.

## One-time stanza setup

After **`filosign-data`** deploy (rebuild pulls new postgres image):

```bash
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign stanza-create
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign check
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign backup --type=full
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign info
```

If you previously ran pgBackRest as root, clear stale locks first:

```bash
docker exec filosign-postgres rm -rf /tmp/pgbackrest
docker exec filosign-postgres chown -R postgres:postgres /var/lib/pgbackrest
```

If logs show `archive-push … --spool-path=…` but [`postgresql.production.conf`](../../deploy/postgres/postgresql.production.conf) does not, **`postgresql.auto.conf` still has an old `ALTER SYSTEM`** — reset it:

```bash
docker exec filosign-postgres psql -U filosign -d filosign -c "ALTER SYSTEM RESET archive_command;"
docker exec filosign-postgres psql -U filosign -d filosign -c "SELECT pg_reload_conf();"
```

## Schedules (host cron or Dokploy job)

| Job | Schedule (UTC) | Command |
|-----|----------------|---------|
| Full | Sun 03:00 | `PGBACKREST_CONTAINER=filosign-postgres ./deploy/scripts/pgbackrest-backup.sh full` |
| Diff | Daily 03:30 | `… backup --type=diff` via script |
| Check | Daily 04:00 | `… check` via script |

[`deploy/scripts/pgbackrest-backup.sh`](../../deploy/scripts/pgbackrest-backup.sh) runs `docker exec -u postgres` and alerts on failure.

## PITR restore drill (staging first)

Pattern from [Data Egret restore flow](https://dataegret.com/2025/12/pgbackrest-pitr-in-docker-a-simple-demo/):

1. Stop API + worker writes; `docker stop filosign-postgres`.
2. Create fresh volume `pg_restore_test` (do not overwrite production `postgres_data`).
3. Restore:

```bash
docker run --rm \
  -v pg_restore_test:/var/lib/postgresql \
  -e PGBACKREST_REPO1_S3_ENDPOINT=… \
  -e PGBACKREST_REPO1_S3_BUCKET=… \
  -e PGBACKREST_REPO1_S3_KEY=… \
  -e PGBACKREST_REPO1_S3_KEY_SECRET=… \
  -e PGBACKREST_REPO1_CIPHER_PASS=… \
  filosign-postgres-pgbackrest:18 \
  pgbackrest --stanza=filosign restore --delta --type=time \
    "--target=YYYY-MM-DD HH:MM:SS+00" --target-action=promote
```

4. Start throwaway container on `pg_restore_test`; verify row counts + drizzle journal.
5. Re-run quarterly.

## Before production `drizzle-kit migrate`

1. `backup --type=full` immediately before migrate.
2. `db:generate` + commit `apps/server/drizzle/`; apply via `bun run db -- migrate sandbox` then `migrate production`.
3. On failure: PITR to timestamp before migrate — not `drizzle-kit push`.

## Local dev

[`compose.dev-full.yml`](../../deploy/compose.dev-full.yml) uses a **sidecar** + [`pgbackrest.conf.example`](../../deploy/pgbackrest/pgbackrest.conf.example) (shared `postgres_data`, **no `pg1-host`**). See [`deploy/README.md`](../../deploy/README.md).

## App connection

`PG_URI` / `DATABASE_URL` point at Postgres directly — **not** through pgBackRest.
