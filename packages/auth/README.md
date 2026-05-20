# @filosign/auth

JWT access tokens, refresh cookie helpers, session storage (browser), and pluggable auth persistence.

## Storage

| Backend | When | Holds |
|---------|------|--------|
| **Dragonfly / Redis** | `DRAGONFLY_URL` set on server | Nonces, `jti` denylist, refresh sessions, distributed rate limits |
| **Postgres** | `DRAGONFLY_URL` unset | Same data in `auth_*` tables (local dev fallback) |

Audit events (`auth_audit_events`) are always written to Postgres.

## Server wiring

[`apps/server/lib/platform/auth/instance.ts`](../../apps/server/lib/platform/auth/instance.ts) builds `authJwt`, `authCookies`, `authStore`, and `checkAuthRateLimit` from env.

```bash
# .env.local / staging
DRAGONFLY_URL=redis://:password@your-vps:6379
```

Dragonfly speaks the Redis protocol; use a standard `redis://` or `rediss://` URL. The store uses **Bun’s native `RedisClient`** (`import { RedisClient } from "bun"`), not ioredis.

## Exports

| Subpath | Use |
|---------|-----|
| `@filosign/auth` | JWT factory, cookies, tokens, Dragonfly store, rate limiters |
| `@filosign/auth/client` | `sessionStorage` access JWT mirror + client `exp` check |
| `@filosign/auth/constants` | TTLs, cookie names, algorithm |

Handlers stay in `apps/server/api/handlers/auth.ts` (Dilithium verify + user DB).
