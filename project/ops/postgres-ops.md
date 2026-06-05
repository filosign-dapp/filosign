# Postgres ops (VPS + R2 backups)

**One page.** Container: `filosign-postgres` · Stanza: `filosign` · Backups: Cloudflare R2.

**Rule:** every pgBackRest command uses `-u postgres`. One backup at a time.

**Save these somewhere safe (password manager):** `POSTGRES_PASSWORD`, all `PGBACKREST_REPO1_*` vars, especially `**PGBACKREST_REPO1_CIPHER_PASS`**. No cipher pass = cannot read backups.

ENVs are required in dokploy, a backup is stored in infisical (filosigndapp@gmail.com -> EU -> Filosign (data dir)) for recovery.

---

## Migrate schema from your laptop (production)

App containers use `postgres` as DB host on Docker DNS. Your Mac cannot resolve that — use the **SSH tunnel helper** (after `compose.data.yml` publishes Postgres on **VPS loopback** `127.0.0.1:5432` only).

**One-time:** `FILOSIGN_PROD_SSH=root@YOUR_VPS` in `deploy/.env` (gitignored).

**Every migrate** (from repo root, `infisical login` once):

```bash
bun run prod -- --migrate
```

Opens SSH `-L 5433:<postgres-container-ip>:5432` (auto-detected via `docker inspect` on the VPS), runs Infisical `prod` + `/app`, rewrites `PG_URI` to `127.0.0.1:5433`, applies Drizzle migrations.

**Optional:** redeploy `filosign-data` with `127.0.0.1:5432:5432` in compose so the tunnel can use host loopback instead of the container IP.

**On the VPS** (optional — same network as `postgres`): `infisical run --env=prod --path=/app -- bun run --cwd apps/server drizzle-kit:migrate` from a repo checkout.

---

## Is everything OK?

Run weekly (or before deploy/migrate). From laptop: `bun run prod` (see `bun run prod -- --help`).

```bash
docker exec filosign-postgres pg_isready -U filosign -d filosign
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign check
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign info
```

**Good:**

```text
pg_isready → accepting connections
check      → completed successfully
info       → status: ok
             full backup: …F  (recent date)
```

**Bad:** `status: error`, no full backup line, or postgres logs repeating `archive command failed`.

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

## Scenario: VPS wiped — R2 still has backups

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

After a bad migration or bad delete — need DB as it was at time T (UTC):

1. Stop app + `docker stop filosign-postgres`.
2. Restore (same as above, but):
  ```bash
   pgbackrest --stanza=filosign restore \
     --type=time "--target=2026-06-05 14:30:00+00" --target-action=promote --archive-mode=off
  ```
3. Start postgres, verify, bring app back.

Use a **throwaway volume** first to practice (see **Prove restore works**).

---

## Scenario: Postgres container broken — volume OK

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

Does not touch production volume.

```bash
# 1. Mark test row
docker exec filosign-postgres psql -U filosign -d filosign -c \
  "CREATE TABLE IF NOT EXISTS backup_drill (id serial PRIMARY KEY, note text);
   INSERT INTO backup_drill (note) VALUES ('drill-ok');"
docker exec -u postgres filosign-postgres pgbackrest --stanza=filosign backup --type=full --log-level-console=info

# 2. Restore to new volume
docker volume create filosign-pg-drill
POSTGRES_IMAGE="$(docker inspect filosign-postgres --format '{{.Config.Image}}')"
# set PGBACKREST_* env (real values)
docker run --rm \
  -e PGBACKREST_STANZA=filosign -e PGBACKREST_REPO1_S3_ENDPOINT -e PGBACKREST_REPO1_S3_BUCKET \
  -e PGBACKREST_REPO1_S3_KEY -e PGBACKREST_REPO1_S3_KEY_SECRET -e PGBACKREST_REPO1_CIPHER_PASS \
  -v filosign-pg-drill:/var/lib/postgresql "$POSTGRES_IMAGE" \
  pgbackrest --stanza=filosign restore --set=latest --type=immediate --target-action=promote --archive-mode=off

# 3. Start temp postgres on 5433
docker run -d --name pg-drill -e POSTGRES_USER=filosign -e POSTGRES_PASSWORD='YOUR_PASSWORD' \
  -e POSTGRES_DB=filosign -v filosign-pg-drill:/var/lib/postgresql -p 5433:5432 \
  "$POSTGRES_IMAGE" postgres -c config_file=/etc/postgresql/postgresql.conf

docker exec pg-drill psql -U filosign -d filosign -c "SELECT * FROM backup_drill;"
# Pass: row drill-ok visible

# 4. Cleanup
docker stop pg-drill && docker rm pg-drill && docker volume rm filosign-pg-drill
```

Run quarterly.

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