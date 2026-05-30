# `@filosign/test` — local harness

Minimal Vite app for exercising `@filosign/react` against a running API + chain without the full client UI.

## Run

From repo root:

```bash
bun run test:dev          # harness only (default VITE_CHAIN=local)
bun run dev -- --local    # full stack + harness optional
```

From this package:

```bash
bun run dev               # VITE_CHAIN=local
bun run dev:sandbox       # VITE_DEPLOYMENT=sandbox VITE_CHAIN=testnet
```

## Env

The harness uses Vite env vars (not `.env` files by default in scripts):

- `VITE_CHAIN` — `local` | `testnet` | `mainnet`
- `VITE_DEPLOYMENT` — when using sandbox profile
- `VITE_SERVER_URL`, `VITE_THIRDWEB_CLIENT_ID` — point at your running stack

See [`SCRIPTS.md`](../../SCRIPTS.md) and [`packages/react-sdk/README.md`](../react-sdk/README.md) for SDK usage patterns.

## Scope

Integration/dev smoke only — not CI unit tests. Repo tests: `bun run test` / `bun run sanity`.
