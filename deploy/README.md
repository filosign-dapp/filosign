# Filosign deploy (Compose)

## File map

| File | Purpose |
|------|---------|
| [`compose.dev.yml`](compose.dev.yml) | **Daily dev** — Dragonfly on `localhost:6379` (minimal flags; session cache) |
| [`compose.dev-full.yml`](compose.dev-full.yml) | Local Postgres + pgBackRest → R2 + **Dragonfly with BullMQ flags** (prod-shaped drill) |
| [`compose.data.yml`](compose.data.yml) | **Production data stack** — Postgres (`archive_mode`), pgBackRest, Dragonfly |
| [`compose.app.yml`](compose.app.yml) | **Production app stack** — API + worker (`SERVER_ROLE`, worker replicas 1) |
| [`compose.production.yml`](compose.production.yml) | **Optional all-in-one** — all five services for first solo VPS |

Dokploy wiring: [`project/ops/dokploy-deploy.md`](../project/ops/dokploy-deploy.md).

## Pinned infra images (Jun 2026)

| Service | Default image | Notes |
|---------|---------------|--------|
| Postgres | `postgres:18-alpine` | Volume mount **`/var/lib/postgresql`** (PG 18 layout; not `/data`) |
| pgBackRest | `percona/percona-pgbackrest:2.58.0-1` | [pgBackRest 2.58.0](https://pgbackrest.org/release.html) |
| Dragonfly | `docker.dragonflydb.io/dragonflydb/dragonfly:v1.37.2` | BullMQ flags in `compose.data.yml` |

Override via [`deploy/.env.example`](.env.example) → copy to `deploy/.env` or set in Dokploy.

**Fresh deploy / no data:** remove old PG 16 volumes before first `up` on 18:

```bash
docker compose -f deploy/compose.dev-full.yml down -v   # or your stack file
```

**Existing `pgbackrest.conf`:** set `pg1-path=/var/lib/postgresql/18/docker` (see [`pgbackrest.conf.example`](pgbackrest/pgbackrest.conf.example)).

## Start order (production two-stack)

1. **Data first** — creates shared network `filosign-data_filosign_net`:

   ```bash
   docker compose -p filosign-data -f deploy/compose.data.yml up -d
   ```

2. **App second** — joins external network:

   ```bash
   docker compose -p filosign-app -f deploy/compose.app.yml up -d
   ```

Do **not** start `filosign-app` before `filosign-data` — app compose expects the external network to exist.

**All-in-one shortcut:**

```bash
docker compose -f deploy/compose.production.yml up -d
```

## App environment (api + worker)

Set in Dokploy / `.env` for the app project:

```bash
DRAGONFLY_URL=redis://dragonfly:6379
PG_URI=postgresql://filosign:SECRET@postgres:5432/:dbname
DB_NAME=filosign
SERVER_ROLE=api   # or worker — set in compose per service
```

**Sprint 4+ BullMQ:**

```bash
BULLMQ_PREFIX={filosign}
```

Full secret list: [`project/ops/dokploy-deploy.md`](../project/ops/dokploy-deploy.md).

## App image build (api + worker)

Both services share one image built from [`deploy/Dockerfile`](Dockerfile) (`bun run build -- --server` inside the image; build context is repo root). Compose sets `SERVER_ROLE=api` or `worker`; worker has `deploy.replicas: 1` and no public port.

```yaml
x-filosign-image: &filosign-image
  build:
    context: ..
    dockerfile: deploy/Dockerfile
  image: ${FILOSIGN_IMAGE:-filosign/server:local}
```

Override `FILOSIGN_IMAGE` only when pulling a pre-built image from a registry instead of building locally.

## Dragonfly checklist

Dragonfly is **cache + queue + locks** — not a throwaway LRU cache.

| Requirement | Why | How |
|-------------|-----|-----|
| **Persistence** | Jobs survive restart | Volume `dragonfly_data:/data`, `--dir=/data` |
| **BullMQ Lua / multi-key** | Avoid global DB lock | `--cluster_mode=emulated`, `--lock_on_hashtags` |
| **Queue key locality** | One thread per queue family | `BULLMQ_PREFIX={filosign}` / queue names `{filosign}:email` |
| **No eviction of queue keys** | BullMQ requires noeviction | Explicit `--maxmemory`; bounded cache TTLs; monitor `used_memory` > 80% |
| **Internal network only** | Broker not on public internet | `expose: 6379` only — no host publish on VPS |

### Never enable in production

| Mistake | Effect |
|---------|--------|
| `--default_lua_flags=allow-undeclared-keys` | Global Lua lock; BullMQ ~50% slower — **forbidden** |
| No volume / ephemeral FS | Queue + cache loss on recreate |
| LRU / allkeys eviction | Job keys evicted → lost or stuck work |
| Separate Dragonfly for cache vs queue on solo VPS | Unnecessary unless RAM contention proven |

Detail: [`project/ops/dragonfly-bullmq-production.md`](../project/ops/dragonfly-bullmq-production.md).

## RAM sizing

Plan headroom for BullMQ streams + cache keys on the same Dragonfly instance:

- Example VPS: 2 GB container → `--maxmemory=1536mb` (see `compose.data.yml`).
- After Sprint 2/4/5 (cache + queues live): monitor `INFO memory` — alert above 80% of `maxmemory`.
- Increase RAM or `--maxmemory` before enabling any eviction policy.

## Local dev

| Need | Command |
|------|---------|
| Fast daily dev (cache only) | `docker compose -f deploy/compose.dev.yml up -d` (or `bun run dev` / `bun run dev -- --deps`) |
| Backup drill + BullMQ-shaped Dragonfly | `docker compose -f deploy/compose.dev-full.yml up -d` |
| App env | `DRAGONFLY_URL=redis://127.0.0.1:6379` |

`compose.dev.yml` intentionally skips BullMQ flags — fine for session cache. Use **`compose.dev-full.yml`** to validate queue flags before VPS deploy.

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

5. Point local app at Postgres + Dragonfly:

   ```bash
   PG_URI=postgresql://filosign:filosign@localhost:5432/:dbname
   DB_NAME=filosign
   DRAGONFLY_URL=redis://127.0.0.1:6379
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

**Note:** `compose.dev-full.yml` uses minimal Postgres conf (no `archive_mode`) — proves **full backups to R2**. Continuous WAL archive + PITR on VPS uses [`postgres/postgresql.production.conf`](postgres/postgresql.production.conf) in `compose.data.yml` — see [`project/ops/postgres-pgbackrest-dokploy.md`](../project/ops/postgres-pgbackrest-dokploy.md).

## Database policy

- **local / staging:** `bun run db -- push <profile>` for fast schema sync
- **sandbox / production:** `db:generate` → commit `apps/server/drizzle/` → `migrate` only

See [SCRIPTS.md](../SCRIPTS.md) and [project/ops/postgres-pgbackrest-dokploy.md](../project/ops/postgres-pgbackrest-dokploy.md).
