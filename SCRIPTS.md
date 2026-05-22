# SCRIPTS.md — monorepo commands (agents)

**Source:** [`package.json`](package.json) → [`scripts/*.ts`](scripts/). Flags after `--`. Help: `bun run <script> -- --help`.

**Rules:** Multi-step → root orchestrators. One package → `bun run --cwd <path> <script>` (not `bun -F`). Boundaries/API: [AGENTS.md](AGENTS.md).

## When to run what

| Goal | Command |
| --- | --- |
| Local dev (bootstrap + server + client + astro) | `bun run dev` or `bun run dev -- --local` |
| Bootstrap + API only | `bun run dev -- --serloc` |
| Client + marketing + email preview | `bun run dev -- --web` |
| React Email preview only | `bun run dev -- --emails` |
| Staging (client + server) | `bun run dev -- --testnet` |
| One app | `bun run dev -- --client --local` etc. or `--cwd apps/<app> dev:local` |
| Format + types (writes files) | `bun run check` |
| CI / pre-push verify (no writes) | `bun run sanity` |
| Match sanity check step only | `bun run check -- --ci --types` |
| Autofix + unit tests | `bun run check && bun run test` |
| Skip Hardhat in sanity | `bun run sanity -- --fast` |
| All tests | `bun run test` |
| Hardhat only | `bun run test -- --contracts` or `bun run contracts -- test` |
| Release builds | `bun run build` (+ flags) |
| DB schema push only | `bun run db -- push local\|testnet` |
| Wipe DB + re-push schema | `bun run db -- purge local\|testnet` |
| Contracts ops | `bun run contracts -- …` |
| Nuke deps | `bun run purge` then `bun install` |
| Email package tests | `bun run test -- --emails` |

**`check`** = Biome `--write` + types. **`sanity`** = `check --ci --types` + turbo unit tests + Hardhat (`contracts -- test`). **`test`** = all packages with tests (includes contracts). CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (`bun run sanity`, Node 22). Pre-push (husky): `bun check --lint` then `bun sanity`.

## Entrypoints

| Key | Script | Role |
| --- | --- | --- |
| `dev` | `dev.ts` | Parallel dev stacks |
| `check` | `check.ts` | Biome + turbo `check-types` |
| `check:ci` | alias | `check -- --ci` (Biome only, no types) |
| `sanity` | `sanity.ts` | CI gate: check + tests + Hardhat |
| `test` | `test.ts` | turbo `test` |
| `build` | `build.ts` | Release builds (`--cwd`, sequential) |
| `db` | `db.ts` | Drizzle purge/push via server |
| `contracts` | `contracts.ts` | Hardhat + deploy/migrate |
| `purge` | `shell/purge.sh` | rm all `node_modules` + `bun.lock` |

**Env profiles:** `local` → `.env.local` · `testnet` → `.env.staging` (package scripts: `dev:local`, `db:push:local`, …).

## `dev`

`dev` / `--local` → bootstrap + server + client + astro · `--serloc` → bootstrap + server · `--web` → client + astro + emails (:30010) · `--emails` → emails only (:30010) · `--testnet` → client + server (no bootstrap) · `--client --local` → Vite only · `--server --local` → bootstrap + API · `--astro` → marketing site only.

Harness: `bun run --cwd packages/test dev` (`VITE_CHAIN`, not env files).

## `check`

Default: `biome check --write .` + `turbo check-types --filter=@filosign/*`.

| Flag | Effect |
| --- | --- |
| `--ci` | Biome read-only (no types unless combined) |
| `--types` | turbo `check-types`; scope: `--server`, `server`, … |
| `--ci --types` | sanity’s check step |

Biome = whole repo; scope args affect **`--types` only**. Pipeline must not use default `check` (writes). Local: `check` → commit → `sanity`. On `git push`, husky runs `scripts/prepush.ts` (lint write, then sanity).

## `sanity`

Default: `check --ci --types` → turbo `test` (`@filosign/*` \ `!@filosign/contracts`) → `contracts -- test` (Hardhat).

`--fast` → skip Hardhat · `--check` · `--test` [scope → `test` orchestrator] · `--contracts` (Hardhat only). `--full` = default (all steps).

## `test`

`bun run test` → all `@filosign/*` with a test script. Scope: `--client`, `--server`, `--emails`, `--shared`, `--crypto` / `--crypto-utils`, `--react` / `--react-sdk`, `--contracts`.

Turbo runs `^check-types` first (dependency typecheck before scoped test is expected).

## `build`

Default order: client → astro → server `compile` → harness → contracts `compile`.

Flags: `--client`, `--astro`, `--server`, `--harness` (`--test`), `--contracts`, `--react` (not ready). Not `turbo run build`.

## `db`

`push` + `local|testnet` — drizzle push only (includes `file_settlement_rules` and other server schema).

`purge` + `local|testnet` — clear schema (`db:purge:*`), then **push** automatically.

## `contracts`

`compile` · `test` (compile + Hardhat) · `node` · `--deploy --local|testnet|mainnet` · `--migrate …`

Local deploy uses `deploy:local` (`--network localhost` + `.env.local`).

| Mode | DB |
| --- | --- |
| deploy | — |
| migrate | local/testnet: `db purge` (includes push) after deploy |

Env: `local` / `testnet` / `mainnet` → `.env.local` / `.env.staging` / `.env.production`. Never hand-edit `definitions/` (deploy only). Test before testnet/mainnet deploy/migrate.

## Turbo

`check-types` + `test` → turbo via orchestrators. Release `build` → root `build.ts`. Dev servers not in turbo. Cache: `.turbo/`.

## Agent reminders

1. Default **`check` writes**; **`sanity`/CI read-only**.
2. **`--cwd`**, not `-F`.
3. Contracts: test before deploy/migrate; no manual `definitions/`.
