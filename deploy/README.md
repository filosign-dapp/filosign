# Filosign deploy (Compose)

## Files

| File | Purpose |
|------|---------|
| [`compose.dev-full.yml`](compose.dev-full.yml) | Local Postgres + pgBackRest → **your R2 bucket** (backup drill) |
| [`compose.data.yml`](compose.data.yml) | Sprint 1: Postgres + pgBackRest + Dragonfly (production-shaped) |
| [`compose.app.yml`](compose.app.yml) | Sprint 1: API + worker |

## Local backup drill (Sprint 0)

1. Copy env and pgBackRest config:

   ```bash
   cp deploy/.env.example deploy/.env
   cp deploy/pgbackrest/pgbackrest.conf.example deploy/pgbackrest/pgbackrest.conf
   # Edit both with your R2 credentials
   ```

2. Start stack:

   ```bash
   docker compose -f deploy/compose.dev-full.yml up -d
   ```

3. Initialize stanza (once):

   ```bash
   docker exec filosign-pgbackrest-dev pgbackrest --stanza=filosign stanza-create
   docker exec filosign-pgbackrest-dev pgbackrest --stanza=filosign check
   ```

4. Full backup to R2:

   ```bash
   chmod +x deploy/scripts/pgbackrest-backup.sh
   ./deploy/scripts/pgbackrest-backup.sh full
   ```

5. Point local app at Postgres:

   ```bash
   PG_URI=postgresql://filosign:filosign@localhost:5432/:dbname
   DB_NAME=filosign
   ```

6. Apply schema (local dev uses push):

   ```bash
   bun run db -- push local
   ```

7. **Restore drill (optional):** stop Postgres, restore to a fresh volume, verify data:

   ```bash
   docker compose -f deploy/compose.dev-full.yml stop postgres
   docker exec filosign-pgbackrest-dev pgbackrest --stanza=filosign --type=time \
     "--target=$(date -u +'%Y-%m-%d %H:%M:%S+00')" restore
   docker compose -f deploy/compose.dev-full.yml start postgres
   docker exec filosign-postgres-dev psql -U filosign -d filosign -c 'SELECT 1'
   ```

**Note:** This compose proves **full backups to R2**. Continuous WAL archive + PITR on VPS is documented in [`project/ops/postgres-pgbackrest-dokploy.md`](../project/ops/postgres-pgbackrest-dokploy.md) (requires `archive_mode` on the Postgres service).

## Production order (Sprint 1+)

1. `docker compose -f deploy/compose.data.yml up -d` (creates `filosign_net`)
2. `docker compose -f deploy/compose.app.yml up -d`

Do not start `filosign-app` before `filosign-data` — the external network must exist.

## Dragonfly (Sprint 1)

Production Dragonfly flags and `maxmemory` are in `compose.data.yml` — see [`project/ops/dragonfly-bullmq-production.md`](../project/ops/dragonfly-bullmq-production.md) (Sprint 1).

## Database policy

- **local / staging:** `bun run db -- push <profile>` for fast schema sync
- **sandbox / production:** `db:generate` → commit `apps/server/drizzle/` → `migrate` only

See [SCRIPTS.md](../SCRIPTS.md) and [project/ops/postgres-pgbackrest-dokploy.md](../project/ops/postgres-pgbackrest-dokploy.md).
