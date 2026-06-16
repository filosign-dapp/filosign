# SCRIPTS.md - monorepo commands (agents)

**Source:** [`package.json`](package.json) → [`scripts/*.ts`](scripts/). Flags after `--`. Help: `bun run <script> -- --help`.

**Rules:** Multi-step → root orchestrators. One package → `bun run --cwd <path> <script>` (not `bun -F`). Boundaries/API: [AGENTS.md](AGENTS.md).

## When to run what

| Goal | Command |
| --- | --- |
| Local dev (compose + bootstrap + server + client + astro) | `bun run dev` or `bun run dev -- --local` (bootstrap: `db purge local`, `contracts --migrate --local`) |
| Dragonfly only | `bun run dev -- --deps` |
| Bootstrap + API only | `bun run dev -- --serloc` |
| Client + marketing + email preview | `bun run dev -- --web` |
| React Email preview only | `bun run dev -- --emails` |
| Staging (internal QA) | `bun run dev -- --staging` |
| Sandbox (public demo) | `bun run dev -- --sandbox` |
| One app | `bun run dev -- --client --local` etc. or `--cwd apps/<app> dev:local` |
| Format + types (writes files) | `bun run check` |
| CI / pre-push verify (no writes) | `bun run sanity` |
| Match sanity check step only | `bun run check -- --ci --types` |
| OSS segment (`oss/`) | `cd oss && bun install && bun test` (nested OSS workspaces; filosign root links `oss/packages/protocol` only) |
| Autofix + unit tests | `bun run check && bun run test` |
| Skip Hardhat in sanity | `bun run sanity -- --fast` |
| All tests | `bun run test` |
| Hardhat only | `bun run test -- --contracts` or `bun run contracts -- test` |
| Release builds | `bun run build` (+ flags) |
| DB schema push (local / staging) | `bun run db -- push local\|staging` |
| DB schema migrate (sandbox / prod + optional local/staging) | `bun run db -- migrate …` |
| Prod VPS (SSH) | `FILOSIGN_PROD_SSH` in `deploy/.env` → `bun run prod -- --help` |
| Prod health (all services) | `bun run prod` (or `bun run prod -- --all --health`) |
| Prod service probe | `bun run prod -- --pg\|--pgbackup\|--dfly\|--api\|--worker` + `--health` or `--info` |
| Prod migrate (SSH tunnel) | `bun run prod -- --migrate` |
| Wipe DB | `bun run db -- purge local\|staging\|sandbox` (local/staging → push; sandbox → migrate) |
| Generate migration SQL | `bun run --cwd apps/server db:generate` |
| Schema ↔ migrations drift check | `bun run db -- migration-check` (also in `bun run sanity -- --ci`) |
| Contracts ops | `bun run contracts -- …` |
| Nuke deps | `bun run purge` then `bun install` |
| Email package tests | `bun run test -- --emails` |
| Re-embed welcome practice PDF (after editing `packages/shared/activation/assets/welcome-practice.pdf`) | `bun run --cwd packages/shared embed-welcome-practice-pdf` |

**`check`** = Biome `--write` + types. **`sanity`** = `check --ci --types` + turbo unit tests + Hardhat (`contracts -- test`). **`test`** = all packages with tests (includes contracts). CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (`bun run sanity`, Node 25 - matches `engines.node` in root `package.json`). Pre-commit (husky): migration commit guard + `bun check --lint`. Pre-push (husky): `bun run sanity -- --ci`.

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
| `sync:email-assets` | `sync-email-assets.ts` | Download 01-Barebone hero image into `apps/astro/public/emails/barebones/` |

**Env profiles:** `local` → `.env.local` · server `staging`/`sandbox`/`production` → Infisical · client staging/sandbox → `.env.staging` / `.env.sandbox` · contracts testnet/mainnet → `packages/evm/.env.staging` / `.env.production`. See [`project/launch/environments.md`](project/launch/environments.md) and [`apps/server/SECRETS.md`](apps/server/SECRETS.md).

## `dev`

`dev` / `--local` → `docker compose -f deploy/compose.dev.yml up -d` + bootstrap + server + client + astro · `--deps` → compose only (foreground) · `--no-deps` → skip compose · `--serloc` → bootstrap + server · `--web` → client + astro + emails (:30010) · `--emails` → emails only (:30010) · `--staging` / `--sandbox` → client + server (no bootstrap) · `--client --local` → Vite only · `--server --local` → bootstrap + API · `--astro` → marketing site only.

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

| Action | Profiles | Tool |
|--------|----------|------|
| `push` | `local`, `staging` | `drizzle-kit push` - fast dev sync (no generate) |
| `migrate` | all profiles | `drizzle-kit migrate` - **required** for sandbox; production via deploy start or laptop tunnel |
| `migration-check` | — | journal/SQL/snapshot integrity + `drizzle-kit check` |
| `confirm-migration-commit --staged` | — | pre-commit guard: blocks when `apps/server/drizzle/` is staged; prints SQL from git index |
| `verify-migrations` | local Postgres | full chain on empty DB + column smoke |
| `purge` | `local`, `staging`, `sandbox` | wipe schema; then **push** (local/staging) or **migrate** (sandbox) |

**Sandbox / production:** never `push` (orchestrator blocks). After schema is stable on local/staging: `bun run db -- generate` → **review SQL** → commit `apps/server/drizzle/` (see commit guard below) → `bun run db -- migrate sandbox` → backup → redeploy app (migrations run on container start) or `bun run prod -- --migrate` (laptop tunnel fallback).

**Migration commit guard:** pre-commit runs `bun run db -- confirm-migration-commit --staged`. Any staged file under `apps/server/drizzle/` fails the hook and prints staged SQL. After you review, commit migrations yourself: `git commit --no-verify -m "db: …"`. Agents must not stage drizzle paths or use `--no-verify`.

**Integrity / smoke:** `bun run db -- migration-check` (CI via `sanity --ci`) · `bun run db -- verify-migrations` (fresh DB + column smoke; needs local Postgres).

**Local / staging:** edit schema → `push` (or `purge` → push). Generate/migrate only when promoting toward sandbox.

Backups: [`project/ops/postgres-ops.md`](project/ops/postgres-ops.md) · local drill: [`deploy/README.md`](deploy/README.md).

## `contracts`

Root orchestrator only (`scripts/contracts.ts` + `scripts/lib/contracts/`). Do not call `deploy:*` / `migrate:*` from package `package.json` (removed).

`compile` · `test` (OSS Hardhat) · `node` · `--migrate --local|testnet|mainnet`

| Command | Steps |
| --- | --- |
| `compile` | OSS `compile` → definitions `gen:definitions` |
| `test` | OSS `test` |
| `--migrate --local` | OSS `compile` → Hardhat deploy (no test gate; for `bun dev` bootstrap) |
| `--migrate --testnet\|mainnet` | OSS `test` → Hardhat deploy (`packages/evm/scripts/deploy.ts`, absolute env file) |

| Profile | Network | Env file |
| --- | --- | --- |
| `--local` | `localhost` | `packages/evm/.env.local` |
| `--testnet` | `baseSepolia` | `.env.staging` |
| `--mainnet` | `base` | `.env.production` |

Solidity + Hardhat cwd: `oss/packages/contracts`. Private deploy outputs: `packages/evm/definitions/`. Public ABIs/chains: `oss/packages/contracts/abis/`, `chains/manifest.json` (via `export:public`). Test before testnet/mainnet migrate.

## Turbo

`check-types` + `test` → turbo via orchestrators. Release `build` → root `build.ts`. Dev servers not in turbo. Cache: `.turbo/`.

## Agent reminders

1. Default **`check` writes**; **`sanity`/CI read-only**.
2. **`--cwd`**, not `-F`.
3. Contracts: test before deploy/migrate; no manual `definitions/`.
