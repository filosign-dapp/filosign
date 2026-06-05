# Dokploy deploy (Filosign)

Two Compose projects on one VPS is the **recommended** model. An optional single-file shortcut exists for the first Hetzner box.

## Two projects vs one

| Model | Compose files | Dokploy projects | When |
|-------|---------------|------------------|------|
| **Two-stack (recommended)** | [`deploy/compose.data.yml`](../../deploy/compose.data.yml) + [`deploy/compose.app.yml`](../../deploy/compose.app.yml) | `filosign-data`, `filosign-app` | Production, staging — scale/redeploy API without touching Postgres |
| **All-in-one (shortcut)** | [`deploy/compose.production.yml`](../../deploy/compose.production.yml) | Single project | First solo VPS, minimal ops |

### Two-stack topology

**`filosign-data`** — Postgres 18 + pgBackRest (in postgres image), Dragonfly (BullMQ flags).

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
| `filosign-data_filosign_net` | `compose.data.yml` (`filosign_net` with explicit name) | `postgres`, `dragonfly`, `api`, `worker` |

App compose references it as an **external** network:

```yaml
networks:
  filosign_net:
    external: true
    name: filosign-data_filosign_net
```

Do **not** publish Dragonfly `6379`, Postgres `5432`, or API `3000` on the VPS host. Dokploy’s own panel uses **host `:3000`**; Filosign API listens on **container `:3000`** and is reached via **Domains** (Traefik → `filosign-api:3000`).

## API routing (Dokploy Domains)

Do **not** use Advanced → Ports to bind API to host `:3000` (conflicts with Dokploy).

1. Open **filosign-app** → **Domains** → Create domain (e.g. `api.filosign.xyz`).
2. **Container port:** `3000` (service `api` / container `filosign-api`).
3. Enable HTTPS (Let’s Encrypt) for production.
4. Set Infisical `SERVER_URL` to that public URL.

Compose uses `expose: 3000` only — same pattern as staging (`3000/tcp` in `docker ps`, no `0.0.0.0:3000` mapping).

## Environment variables

Wire secrets via **Infisical** → Dokploy env injection. Split by project:

### `filosign-data` project

| Variable | Service | Notes |
|----------|---------|-------|
| `POSTGRES_USER` | postgres | Default `filosign` |
| `POSTGRES_PASSWORD` | postgres | Required |
| `POSTGRES_DB` | postgres | Default `filosign` |
| `PGBACKREST_REPO1_S3_*`, `PGBACKREST_REPO1_CIPHER_PASS` | postgres | Dokploy **Environment** (see [`compose.data.yml`](../../deploy/compose.data.yml)); not Infisical at runtime |

**Backups:** see [`postgres-ops.md`](postgres-ops.md) — health, backup, restore scenarios.

No Filosign app secrets on the data project.

### `filosign-app` project

**Dokploy Environment is not automatic inside containers.** [`compose.app.yml`](../../deploy/compose.app.yml) only passes variables listed under `environment:` (via `${VAR}` from Dokploy). Infisical bootstrap + `POSTGRES_PASSWORD` must be in Dokploy; everything else can live in Infisical `prod` / `staging`.

| Variable | api | worker | Notes |
|----------|-----|--------|-------|
| `INFISICAL_CLIENT_ID` | ✓ | ✓ | Machine identity — **required in Dokploy** (entrypoint) |
| `INFISICAL_CLIENT_SECRET` | ✓ | ✓ | Machine identity — **required in Dokploy** |
| `INFISICAL_PROJECT_ID` | ✓ | ✓ | Infisical project UUID — **required in Dokploy** |
| `INFISICAL_ENV` | ✓ | ✓ | `prod` / `staging` / `sandbox` (default in compose: `prod`) |
| `INFISICAL_API_URL` | ✓ | ✓ | EU: `https://eu.infisical.com` (omit for US cloud) |
| `INFISICAL_SECRET_PATH` | ✓ | ✓ | Infisical folder for app secrets (default `/app`; must match dashboard path) |
| `SERVER_ROLE` | `api` | `worker` | Set in compose; do not override |
| `DRAGONFLY_URL` | ✓ | ✓ | `redis://dragonfly:6379` (hostname on shared network) |
| `PG_URI` | Infisical | Infisical | e.g. `postgresql://filosign:SECRET@postgres:5432/:dbname` — **not** compose-built |
| `DB_NAME` | Infisical | Infisical | e.g. `filosign` — match data stack |
| `POSTGRES_PASSWORD` | — | — | Only for **filosign-data** project; app stack does not need it in Dokploy if `PG_URI` is in Infisical |
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
3. Deploy data stack; first-time backup setup → [`postgres-ops.md`](postgres-ops.md).
4. Create project **`filosign-app`** → compose file `deploy/compose.app.yml`.
5. Add **Domain** for API (container port **3000**); remove any `API_PORT` env override if present.
6. Inject Infisical secrets; override `FILOSIGN_IMAGE` only when using a pre-built registry image instead of compose `build`.
7. Lock worker replicas to **1**.
8. Schedule pgBackRest cron jobs on data project (full / diff / check).

## Related docs

- [`deploy/README.md`](../../deploy/README.md) — file map, start order, Dragonfly checklist
- [`dragonfly-bullmq-production.md`](dragonfly-bullmq-production.md) — broker flags, memory, failure modes
- [`postgres-ops.md`](postgres-ops.md) — Postgres backup, health, disaster recovery
