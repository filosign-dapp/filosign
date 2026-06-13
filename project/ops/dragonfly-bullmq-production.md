# Dragonfly + BullMQ (production)

Dragonfly on the Filosign VPS is **cache + queue + locks** - not a disposable LRU cache. Postgres remains source of truth for billing, settlements, and durable user data.

Compose reference: [`deploy/compose.data.yml`](../../deploy/compose.data.yml). Ops deploy: [`dokploy-deploy.md`](dokploy-deploy.md).

External references:

- [BullMQ - Going to production](https://docs.bullmq.io/guide/going-to-production)
- [Dragonfly - BullMQ integration](https://www.dragonflydb.io/docs/integrations/bullmq)

## Role in Filosign

| Use | Examples | Durability expectation |
|-----|----------|------------------------|
| **Cache** | Session cache (5m TTL), entitlements cache-aside (1h TTL) | Miss → DB; acceptable loss on restart with cold cache |
| **Queue** | BullMQ email, webhooks, settlement sync (Sprint 4+) | Jobs must survive container restart |
| **Locks** | Cron leader election, relayer lock (Sprint 5) | Must not duplicate across processes incorrectly |

On a solo VPS, **one Dragonfly instance** serves all three. Split cache vs queue only if measured RAM contention (Tier D - not default).

## Compose flags explained

Production Dragonfly service (from `compose.data.yml`):

```yaml
command:
  - --cluster_mode=emulated
  - --lock_on_hashtags
  - --dir=/data
  - --maxmemory=1536mb
volumes:
  - dragonfly_data:/data
```

| Flag | Purpose |
|------|---------|
| `--cluster_mode=emulated` | BullMQ Lua scripts use multi-key ops; emulated cluster avoids global DB lock |
| `--lock_on_hashtags` | Keys with `{tag}` hash to same slot - one thread per queue family |
| `--dir=/data` | Persistence directory on volume |
| `--maxmemory=1536mb` | Cap below container RAM; tune per VPS (example: 2 GB container → 1536 MB) |

**Do not publish `6379` to the host public interface.** App containers connect via `redis://dragonfly:6379` on the internal Docker network.

## Why `allow-undeclared-keys` is off

Never enable:

```bash
--default_lua_flags=allow-undeclared-keys
```

That flag causes a **global Lua lock** on the entire database. BullMQ throughput drops ~50% and queue latency spikes. Filosign production compose **forbids** this flag.

## Persistence and restart behavior

- Volume `dragonfly_data` mounted at `/data`.
- Container recreate: queued jobs and cache keys on disk are restored when Dragonfly restarts (subject to snapshot settings for your Dragonfly version).
- **Optional:** volume snapshot of `dragonfly_data` before upgrades - not a substitute for Postgres backups.
- **Postgres is truth** for billing, settlements, and user records. Dragonfly loss is recoverable via DB + job retry, not data loss for money-moving state.

Verify after deploy:

```bash
docker exec filosign-dragonfly redis-cli PING
# → PONG
```

## Eviction / memory policy

BullMQ requires **[noeviction](https://docs.bullmq.io/guide/going-to-production)** semantics for queue keys - job keys must not be evicted.

| Requirement | How |
|-------------|-----|
| No LRU/allkeys eviction on queue keys | Set explicit `--maxmemory` below container cap; Dragonfly default avoids evicting keys needed by BullMQ when sized correctly |
| Bounded cache growth | Session TTL 5m, entitlements TTL 1h - cache keys expire; do not treat Dragonfly as unbounded cache |
| Monitor | Alert when `used_memory` > 80% of `maxmemory` (`INFO memory`) |
| Staging load test | Run `INFO memory` under queue + cache load before production cutover |

If memory pressure persists after bounded TTLs: increase VPS RAM or raise `--maxmemory` - do not enable allkeys-LRU on the shared broker.

## Hashtag queue naming convention

BullMQ prefix and queue names use Redis hashtags so related keys land in one slot:

```bash
BULLMQ_PREFIX={filosign}
# Queue examples: {filosign}:email, {filosign}:webhooks
```

Hashtag = substring inside `{...}` in the key name. With `--lock_on_hashtags`, each queue family gets dedicated thread locality.

## Connection model

Filosign server (Sprint 4+):

| Client | Library | Role |
|--------|---------|------|
| Session / cache-aside | Bun `RedisClient` | Short-lived cache reads/writes |
| BullMQ Queue (producer) | `ioredis` | API enqueues jobs - fail fast if broker down |
| BullMQ Worker (consumer) | `ioredis` (separate connection) | Blocking pop - dedicated connection per BullMQ guidance |

Use **two ioredis connections** (Queue vs Worker) plus the Bun cache client. Same `DRAGONFLY_URL` for all:

```bash
DRAGONFLY_URL=redis://dragonfly:6379
BULLMQ_PREFIX={filosign}
```

See [BullMQ going to production](https://docs.bullmq.io/guide/going-to-production) for reconnect and graceful worker shutdown (`SIGTERM` → close workers before exit).

## Failure modes

| Failure | API behavior | Worker behavior |
|---------|--------------|-----------------|
| **Dragonfly down** | Cache miss → Postgres; session re-validated from DB | Blocks/reconnects; jobs retry after broker returns |
| **Producer cannot connect** | Enqueue fails fast - return 503 or defer to cron backfill where applicable | N/A |
| **Worker mid-job crash** | N/A | BullMQ retries stalled jobs; idempotent handlers required |
| **OOM / maxmemory hit** | Cache writes may fail; queue writes fail (BullMQ noeviction) | Alert + scale RAM before enabling eviction |

Dragonfly outage does **not** corrupt Postgres. Worst case: slower API (cache miss), delayed background jobs until broker recovers.

## Upgrade / backup

1. Optional: snapshot `dragonfly_data` volume before Dragonfly image upgrade.
2. Rolling restart: single instance - brief queue pause; workers should drain gracefully.
3. **Postgres pgBackRest backups** are the critical DR path - see [`postgres-ops.md`](postgres-ops.md).

## Production checklist

| ✓ | Item |
|---|------|
| | Image `docker.dragonflydb.io/dragonflydb/dragonfly:v1.37.2` (pin in `deploy/.env.example`) |
| | Volume `dragonfly_data:/data` |
| | `--cluster_mode=emulated` + `--lock_on_hashtags` |
| | **No** `--default_lua_flags=allow-undeclared-keys` |
| | `6379` not on public interface |
| | `--maxmemory` sized with headroom; monitor `used_memory` |
| | `BULLMQ_PREFIX={filosign}` in app env (Sprint 4+) |
| | `DRAGONFLY_URL=redis://dragonfly:6379` on api + worker |

## Local dev

| Compose | Dragonfly flags | Use |
|---------|-----------------|-----|
| [`deploy/compose.dev.yml`](../../deploy/compose.dev.yml) | Minimal (no BullMQ flags) | Daily dev - session cache only |
| [`deploy/compose.dev-full.yml`](../../deploy/compose.dev-full.yml) | Production-shaped (`emulated`, `lock_on_hashtags`, volume) | Test queue flags + backup drill before VPS |

Do **not** use root dev compose for Dokploy production.
