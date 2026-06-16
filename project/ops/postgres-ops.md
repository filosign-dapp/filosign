# Postgres ops (VPS + R2 backups)

**One page.** Container: `filosign-postgres` · Stanza: `filosign` · Backups: Cloudflare R2.

**Rule:** every pgBackRest command uses `-u postgres`. One backup at a time.

**Save these somewhere safe (password manager):** `POSTGRES_PASSWORD`, all `PGBACKREST_REPO1_*` vars, especially `**PGBACKREST_REPO1_CIPHER_PASS`**. No cipher pass = cannot read backups.

ENVs are required in dokploy, a backup is stored in infisical (filosigndapp@gmail.com -> EU -> Filosign (data dir)) for recovery.

---

## Migrate schema from your laptop (production)

App containers use `postgres` as DB host on Docker DNS. Your Mac cannot resolve that - use the **SSH tunnel helper** (after `compose.data.yml` publishes Postgres on **VPS loopback** `127.0.0.1:5432` only).

**One-time:** `FILOSIGN_PROD_SSH=root@YOUR_VPS` in `deploy/.env` (gitignored).

Schema history starts from [`apps/server/drizzle/0000_initial.sql`](../../apps/server/drizzle/0000_initial.sql) (squashed baseline). **Every schema change:** edit Drizzle schema → `bun run db -- generate` → commit `apps/server/drizzle/` (SQL + `meta/_journal.json` + snapshot). Do not add `.sql` files without a matching journal entry — `bun run prod -- --migrate` only applies tags listed in [`meta/_journal.json`](../../apps/server/drizzle/meta/_journal.json). Drift check: `bun run db -- migration-check`.

### Wipe production DB (pre-production only)

**Deletes all app data** (users, files, settlements, etc.). R2 blobs and on-chain state are not cleared. Take a pgBackRest backup first when you might need to recover.

**Laptop `deploy/.env`:** `FILOSIGN_PROD_SSH`, container names from `docker ps` (see [`deploy/.env.example`](../../deploy/.env.example)), and **`PROD_PG_DB=filosign-prod`** (must match Infisical `DB_NAME`).

1. **Stop app** (keep Postgres running):

```bash
docker stop "$CONTAINER_API" "$CONTAINER_WORKER"
# e.g. filosign-prodapp-dfj8yb-api-1 filosign-prodapp-dfj8yb-worker-1
```

2. **Drop both schemas** on the VPS (`public` = app tables; `drizzle` = migration journal). Dropping only `public` leaves stale migration rows and `bun run prod -- --migrate` will skip creating tables.

```bash
docker exec -it "$CONTAINER_POSTGRES" psql -U filosign -d filosign-prod -c "
  DROP SCHEMA public CASCADE;
  DROP SCHEMA IF EXISTS drizzle CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO filosign;
  GRANT ALL ON SCHEMA public TO public;
"
```

3. **Migrate from laptop** (before starting api/worker):

```bash
bun run prod -- --migrate
```

4. **Verify on VPS:**

```bash
docker exec "$CONTAINER_POSTGRES" psql -U filosign -d filosign-prod -c \
  "SELECT to_regclass('public.job_outbox'); SELECT count(*) FROM drizzle.__drizzle_migrations;"
```

Expect `job_outbox` present and migration count matching [`apps/server/drizzle/meta/_journal.json`](../../apps/server/drizzle/meta/_journal.json).

5. **Clear BullMQ cache** (recommended):

```bash
docker exec "$CONTAINER_DRAGONFLY" redis-cli FLUSHALL
```

6. **Start app:**

```bash
docker start "$CONTAINER_API" "$CONTAINER_WORKER"
```

Also use this flow after squash reset or when Drizzle’s journal no longer matches applied migrations.

### First prod apply (or after squash reset)

Same as **Wipe production DB** above when the database is empty or corrupt. Legacy stacks may use database name `filosign` instead of `filosign-prod`; set `PROD_PG_DB` accordingly.

### Routine migrate (after first apply)

**Primary (Dokploy):** api and worker containers run `./drizzle-migrate` on start via `container-start.sh` before `./server` / `./worker`. Redeploy `filosign-app` after committing `apps/server/drizzle/`.

**Fallback (laptop SSH tunnel):** from repo root (`infisical login` once):

```bash
bun run prod -- --migrate
```

Opens SSH `-L 5433:127.0.0.1:5432` on the VPS (loopback from `compose.data.yml`), runs Infisical `prod` + `/app`, builds an explicit tunnel URL to `DB_NAME`, applies pending Drizzle migrations via `drizzle.migrate.config.ts`, and verifies the journal row count through **the same tunnel URL** before exit.

Before migrate, the script prints **local journal** tags and **remote applied** count. If remote count equals local journal length, nothing runs. If you added a migration locally but journal length did not increase, run `bun run db -- generate` and commit before migrating.

**Common pitfall:** drizzle-kit connects to `127.0.0.1:5433` on your laptop. If that port is already taken (local Postgres, a stale tunnel), SSH may fail silently and migrate hits the wrong database while the VPS `docker exec` probe still reads `filosign-prod`. The script now checks the tunnel is listening and compares tunnel vs VPS journal counts before applying.

**Optional:** redeploy `filosign-data` with `127.0.0.1:5432:5432` in compose so the tunnel can use host loopback instead of the container IP.

**Emergency manual SQL** on the VPS (when deploy migrate and laptop tunnel both fail): `docker exec -c` against Postgres - see wipe/verify sections above. Do not rely on a repo checkout on the VPS (Dokploy images have no git tree).

---

## Is everything OK?

Run weekly (or before deploy/migrate). From laptop: `bun run prod` (see `bun run prod -- --help`).

```bash
docker exec filosign-postgres pg_isready -U filosign -d filosign
docker exec filosign-postgres psql -U filosign -d filosign -c \
  "SELECT current_setting('archive_mode') AS archive_mode, current_setting('archive_timeout') AS archive_timeout, last_archived_wal, now() - last_archived_time AS archive_lag FROM pg_stat_archiver;"
PGBACKREST_CONTAINER=filosign-postgres deploy/scripts/pgbackrest-backup.sh check-wal
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign check
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign info
```

**Good:**

```text
pg_isready   → accepting connections
archive_lag  → under ~6 minutes (production conf sets archive_timeout = 300)
check-wal    → ok
check        → completed successfully
info         → status: ok
               full backup: …F  (recent date)
               wal archive max close to current WAL
```

**Bad:** `status: error`, no full backup line, postgres logs repeating `archive command failed`, or `archive_lag` of hours while the DB is taking writes (usually `archive_timeout = 0` or `archive_mode` off after restore).

---

## WAL archiving (continuous PITR)

Scheduled **full/diff** backups are not enough for intraday PITR. Postgres must **`archive-push` every WAL segment** to R2 via `archive_command`.

Production [`postgresql.production.conf`](../../deploy/postgres/postgresql.production.conf) sets **`archive_timeout = 300`** (same as [`pgbackrest.conf`](../../deploy/postgres/pgbackrest.conf) `archive-timeout`) so a quiet database still closes and archives a WAL segment every few minutes. Without it, a single 16MB segment can stay open for hours; R2 looks stale even though Postgres is healthy.

After any **restore + promote**, re-enable archiving (pgBackRest may write `archive_mode = off`):

```bash
docker exec filosign-postgres psql -U filosign -c "
  ALTER SYSTEM SET archive_mode = on;
  SELECT pg_reload_conf();
"
docker exec filosign-postgres rm -f /var/lib/postgresql/18/docker/postgresql.auto.conf
docker restart filosign-postgres
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign check
```

The postgres image entrypoint strips stale `restore_command` from `postgresql.auto.conf` on start when not in recovery.

---

## Scenario: first-time setup (empty R2 / new VPS)

Only when R2 bucket is **empty** or you never ran this before:

```bash
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign stanza-create
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign check
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign backup --type=full --log-level-console=info
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign info
```

Do **NOT** repeat `stanza-create` on a working system.

---

## Scenario: take a backup now

Before migrations, big releases, or manual prod edits:

```bash
docker exec -u postgres filosign-postgres \
  pgbackrest --stanza=filosign backup --type=full --log-level-console=info
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign info
```

Wait until `info` shows the new full backup. If it hangs, see **Backup stuck** below.

---

## Scenario: VPS wiped - R2 still has backups

GitHub + Dokploy = new empty Postgres. Data is in R2.

1. **New VPS** → install Dokploy → redeploy `**filosign-data`** with **same** Dokploy env (R2 + cipher pass + postgres password).
2. **Do not** rely on a fresh empty DB. Stop app if running. Stop postgres:
  ```bash
   docker stop filosign-postgres
  ```
3. **Restore** into the postgres volume (postgres container can stay stopped; use a one-off run):
  ```bash
   POSTGRES_IMAGE="$(docker inspect filosign-postgres --format '{{.Config.Image}}')"
   # Export same PGBACKREST_* env as Dokploy, then:
   docker run --rm \
     -e PGBACKREST_STANZA=filosign \
     -e PGBACKREST_REPO1_S3_ENDPOINT \
     -e PGBACKREST_REPO1_S3_BUCKET \
     -e PGBACKREST_REPO1_S3_KEY \
     -e PGBACKREST_REPO1_S3_KEY_SECRET \
     -e PGBACKREST_REPO1_CIPHER_PASS \
     -v filosign-data_postgres_data:/var/lib/postgresql \
     "$POSTGRES_IMAGE" \
     pgbackrest --stanza=filosign --log-level-console=info restore \
       --set=latest --type=immediate --target-action=promote --archive-mode=off
  ```
   Volume name: `docker volume ls | grep postgres` (often `filosign-data_postgres_data`).
4. **Start postgres**, verify, redeploy app:
  ```bash
   docker start filosign-postgres
   docker exec filosign-postgres pg_isready -U filosign -d filosign
   docker exec filosign-postgres psql -U filosign -d filosign -c "SELECT count(*) FROM drizzle.__drizzle_migrations;"
  ```
5. Redeploy `**filosign-app**`.

**Skip `stanza-create`** if R2 already has backups from before.

---

## Scenario: restore to a specific time (PITR)

After a bad migration or bad delete - need DB as it was at time T (UTC):

1. Stop app + `docker stop filosign-postgres`.
2. Restore (same as above, but):
  ```bash
   pgbackrest --stanza=filosign restore \
     --type=time "--target=2026-06-05 14:30:00+00" --target-action=promote --archive-mode=off
  ```
3. Start postgres, verify, run **post-restore archiving** (above), take a **full** backup, bring app back.

Use a **throwaway volume** first to practice (see **Prove restore works**).

---

## Scenario: Postgres container broken - volume OK

Redeploy `filosign-data` in Dokploy. Data volume usually survives. No restore needed if volume intact.

```bash
docker exec filosign-postgres pg_isready -U filosign -d filosign
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign check
```

---

## Scenario: R2 bucket deleted

**Backups are gone.** Redeploy gives empty DB. Run **first-time setup** again. Treat as new production.

---

## Scenario: prove restore works (drill, safe)

Does not touch the production volume. Snapshot live row counts, restore **latest full + all WAL** (`--type=default`) to `filosign-pg-drill` on `127.0.0.1:5433`, diff counts.

1. On live prod: save per-table row counts; note newest full backup label (`…F`) from `pgbackrest info` (not `--set=latest`).
2. `pgbackrest restore --set=<FULL_F> --type=default --archive-mode=off` into `filosign-pg-drill`; `chown postgres:postgres` on the volume.
3. Start `pg-drill` with the same image, **bind-mount** `postgresql.conf` from prod (`docker cp` if needed), and **PGBACKREST\_\*** env for WAL replay.
4. Wait for `archive recovery complete` in logs; diff table counts vs snapshot.
5. `docker stop pg-drill && docker rm pg-drill && docker volume rm filosign-pg-drill`.

Run quarterly and after any restore-to-prod incident.

---

## Scenario: errors in logs


| Symptom                                  | Cause                  | Fix                                                                |
| ---------------------------------------- | ---------------------- | ------------------------------------------------------------------ |
| `[103]` / `[055]` missing `archive.info` | Empty R2 or no stanza  | **First-time setup**                                               |
| `[050]` lock                             | Backup already running | Wait; `ps aux | grep pgbackrest`                                   |
| `[041]` permission                       | Ran pgBackRest as root | Always `-u postgres`                                               |
| `archive-push … --spool-path`            | Old `ALTER SYSTEM`     | `ALTER SYSTEM RESET archive_command;` + `SELECT pg_reload_conf();` |
| `backup/expire running N%`               | Backup in progress     | Wait, then `info`                                                  |
| Deleted R2 bucket                        | You deleted backups    | **First-time setup**; data only if volume survived                 |


Clear stale lock (only if **no** pgbackrest process running):

```bash
docker exec filosign-postgres rm -f /var/lib/pgbackrest/lock/filosign-backup-*.lock
```

---

## Scenario: backup stuck

```bash
docker exec filosign-postgres tail -30 /var/lib/pgbackrest/log/filosign-backup.log
docker exec filosign-postgres ps aux | grep pgbackrest
```

If idle and no `status: ok` in `info`, run one backup (not the full setup script).

---

## Schedule (later)


| When                           | What                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| Daily                          | `check`                                                                                  |
| Daily                          | diff backup (cron + `[pgbackrest-backup.sh](../../deploy/scripts/pgbackrest-backup.sh)`) |
| Weekly                         | full backup                                                                              |
| Before `prod --migrate` | full backup                                                                              |
| Quarterly                      | restore drill above                                                                      |


---

## Dokploy env (`filosign-data`)


| Variable                         | Required |
| -------------------------------- | -------- |
| `POSTGRES_PASSWORD`              | yes      |
| `PGBACKREST_REPO1_S3_ENDPOINT`   | yes      |
| `PGBACKREST_REPO1_S3_BUCKET`     | yes      |
| `PGBACKREST_REPO1_S3_KEY`        | yes      |
| `PGBACKREST_REPO1_S3_KEY_SECRET` | yes      |
| `PGBACKREST_REPO1_CIPHER_PASS`   | yes      |


---

## Cheat sheet

```bash
# Health
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign check
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign info

# Backup
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign backup --type=full --log-level-console=info

# Postgres up?
docker exec filosign-postgres pg_isready -U filosign -d filosign
```

**Deploy app when:** `info` → `status: ok` + recent full backup.

**Redeploy after VPS wipe:** same Dokploy env → restore from R2 → start postgres → deploy app.