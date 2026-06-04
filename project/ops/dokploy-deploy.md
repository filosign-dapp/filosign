# Dokploy deploy (Filosign)

Two Compose projects on one VPS is the **recommended** model. An optional single-file shortcut exists for the first Hetzner box.

## Two projects vs one

| Model | Compose files | Dokploy projects | When |
|-------|---------------|------------------|------|
| **Two-stack (recommended)** | [`deploy/compose.data.yml`](../../deploy/compose.data.yml) + [`deploy/compose.app.yml`](../../deploy/compose.app.yml) | `filosign-data`, `filosign-app` | Production, staging — scale/redeploy API without touching Postgres |
| **All-in-one (shortcut)** | [`deploy/compose.production.yml`](../../deploy/compose.production.yml) | Single project | First solo VPS, minimal ops |

### Two-stack topology

**`filosign-data`** — Postgres (`archive_mode=on`), pgBackRest sidecar, Dragonfly (BullMQ flags).

**`filosign-app`** — API (`SERVER_ROLE=api`, HTTP port) + worker (`SERVER_ROLE=worker`, no public port).

Shared Docker network: **`filosign-data_filosign_net`** (created by the data project).

```bash
# Bootstrap order — data first
docker compose -p filosign-data -f deploy/compose.data.yml up -d
docker compose -p filosign-app -f deploy/compose.app.yml up -d
```

If the app project fails with **network not found**, the data stack has not been started yet.

## Networks

| Network | Created by | Used by |
|---------|------------|---------|
| `filosign-data_filosign_net` | `compose.data.yml` (`filosign_net` with explicit name) | `postgres`, `pgbackrest`, `dragonfly`, `api`, `worker` |

App compose references it as an **external** network:

```yaml
networks:
  filosign_net:
    external: true
    name: filosign-data_filosign_net
```

Do **not** publish Dragonfly `6379` or Postgres `5432` to the VPS public interface. API is the only service with a host port.

## Environment variables

Wire secrets via **Infisical** → Dokploy env injection. Split by project:

### `filosign-data` project

| Variable | Service | Notes |
|----------|---------|-------|
| `POSTGRES_USER` | postgres | Default `filosign` |
| `POSTGRES_PASSWORD` | postgres | Required |
| `POSTGRES_DB` | postgres | Default `filosign` |
| `PGBACKREST_REPO1_S3_*`, `PGBACKREST_REPO1_CIPHER_PASS` | postgres + pgbackrest | Dokploy **Environment** (see [`compose.data.yml`](../../deploy/compose.data.yml)); not Infisical at runtime |

No Filosign app secrets on the data project.

**pgBackRest after data deploy:** WAL `archive-push` runs inside **postgres** (local `pg1-path`, no `pg1-host`). The **pgbackrest** sidecar uses `pg1-host=postgres` for `docker exec` backups. Once all three containers are up:

```bash
docker exec filosign-pgbackrest pgbackrest --stanza=filosign stanza-create
docker exec filosign-pgbackrest pgbackrest --stanza=filosign check
docker exec filosign-pgbackrest pgbackrest --stanza=filosign backup --type=full
```

Postgres logs should not repeat `[072] archive-push command must be run on the PostgreSQL host` after redeploying current `compose.data.yml`.

### `filosign-app` project

| Variable | api | worker | Notes |
|----------|-----|--------|-------|
| `SERVER_ROLE` | `api` | `worker` | Set in compose; do not override |
| `DRAGONFLY_URL` | ✓ | ✓ | `redis://dragonfly:6379` (hostname on shared network) |
| `PG_URI` | ✓ | ✓ | `postgresql://user:pass@postgres:5432/:dbname` |
| `DB_NAME` | ✓ | ✓ | Match data stack |
| `POSTGRES_PASSWORD` | ✓ | ✓ | Interpolates into `PG_URI` in compose |
| `FC_SERVER_PRIVATE_KEY` | ✓ | ✓ | Relayer key — worker signs txs |
| `FC_SERVER_ADDRESS` | ✓ | ✓ | Relayer address |
| `DEPLOYMENT`, `CHAIN`, `SERVER_URL`, `CLIENT_URL`, `ASTRO_URL` | ✓ | ✓ | Tier config |
| `S3_*`, `THIRDWEB_*`, `RESEND_*`, `DODO_*`, `POSTHOG_*` | ✓ | optional | API handles HTTP; worker may need subset for jobs |

**Sprint 4+ BullMQ:**

```bash
BULLMQ_PREFIX={filosign}
```

Same `DRAGONFLY_URL` for api (Queue producer) and worker (Worker consumer).

### All-in-one (`compose.production.yml`)

Merge data + app env into one Dokploy project. Same variable names; all services share `filosign_net`.

## Worker scale lock (required)

**Worker MUST stay at 1 replica** on a solo VPS.

Why:

- Multiple worker containers share one relayer private key.
- BullMQ `concurrency: 1` is **per process** — two containers = two concurrent relayer txs.
- Production hardening adds Redis `fs:lock:relayer:{address}` (300s TTL) around all `FC_SERVER` writes, but **one worker replica** is still recommended to avoid duplicate cron ticks and duplicated job side effects.

Compose sets `deploy.replicas: 1`, but **Dokploy UI scale overrides compose**. In Dokploy:

1. Open the **worker** service.
2. Set **replicas / scale = 1** explicitly.
3. Disable manual scale-to-2 on worker.
4. Do not enable auto-scaling on worker.

## Dokploy checklist

1. Create project **`filosign-data`** → compose file `deploy/compose.data.yml`.
2. Set all required `PGBACKREST_REPO1_*` + `POSTGRES_PASSWORD` in Dokploy Environment (see [`compose.data.yml`](../../deploy/compose.data.yml)).
3. Deploy data stack; run stanza-create + check (see [`postgres-pgbackrest-dokploy.md`](postgres-pgbackrest-dokploy.md)).
4. Create project **`filosign-app`** → compose file `deploy/compose.app.yml`.
5. Inject Infisical secrets; override `FILOSIGN_IMAGE` only when using a pre-built registry image instead of compose `build`.
6. Lock worker replicas to **1**.
7. Schedule pgBackRest cron jobs on data project (full / diff / check).

## Related docs

- [`deploy/README.md`](../../deploy/README.md) — file map, start order, Dragonfly checklist
- [`dragonfly-bullmq-production.md`](dragonfly-bullmq-production.md) — broker flags, memory, failure modes
- [`postgres-pgbackrest-dokploy.md`](postgres-pgbackrest-dokploy.md) — WAL archive, PITR, R2
