# Testing (Filosign)

Where tests live, how to run them, and how to add new ones.

## Layout

| Location | Purpose |
|----------|---------|
| `src/` or `lib/` | Production only - no `*.test.ts`, no test helpers or fixtures |
| **`tests/`** | All Bun tests for that workspace |
| **`tests/support/`** | Mocks, fixtures, fakes - never imported from production |
| **`tests/<area>/`** | Optional mirror of product areas (e.g. `tests/domains/`, `tests/platform/`) when structure helps |

**Exception:** [`oss/packages/contracts/test/`](oss/packages/contracts/test/) uses Hardhat’s `test/` + `*.spec.ts` convention.

## How to group test files

Align with [AGENTS.md](AGENTS.md) domain layout - merge smartly, not by line count:

1. **Separate files for real boundaries** - e.g. Telegram transport vs PostHog transport; critical platform alerts vs product analytics.
2. **Merge when same feature or domain** - e.g. billing + dodo webhooks; all “emit critical alert on wiring failure” cases in one wiring suite.
3. **`describe()` inside a file** for small related cases - not a new file beside every production module.
4. **Avoid** one monolith per app/package; **avoid** scattered wiring tests next to `pino.ts`, `cron.ts`, etc.
5. **Split when a file is hard to navigate** - use the same logical seams as production (`utils/` when ~100+ lines or 2+ callers).

## Run

```bash
bun run test                    # all @filosign/* packages (orchestrator)
bun run test -- --server        # one package
bun run --cwd apps/server test  # server only
bun run --cwd packages/logger test
```

Contract tests: `bun run contracts -- test` (OSS Hardhat).

Typecheck including tests: each workspace with `tests/` runs `tsc -p tsconfig.tests.json` as part of `check-types`.

**Server:** [`apps/server/bunfig.toml`](apps/server/bunfig.toml) preloads [`tests/preload.ts`](apps/server/tests/preload.ts) so `@/env` is stubbed before modules like `pino` load during unrelated domain tests.

## Do not add

Anti-patterns that add noise without exercising production behavior:

- **`typeof fn === "function"` / "is exported" tests** — TypeScript and imports already enforce exports.
- **Duplicate `describe` blocks across files** for the same module — merge into one domain file with nested `describe`.
- **Constant-array membership only** — e.g. `expect(PLAN_IDS).toContain("teams")` with no behavior under test.
- **Production logic copy-pasted in the test file** — import the real helper or delete the test.
- **Many tiny one-off files** — prefer one domain file + nested `describe` (see grouping rules above).

CI runs [`scripts/check-test-antipatterns.ts`](scripts/check-test-antipatterns.ts) during `bun run sanity` to catch export-only patterns in `tests/`.

## Adding tests

- **New Bun workspace:** create `tests/` at package root; add `tsconfig.tests.json` if the main `tsconfig` excludes tests, plus `tests/tsconfig.json` extending it so the IDE typechecks test files with Bun types (same pattern as [`apps/server/tests/tsconfig.json`](apps/server/tests/tsconfig.json)).
- **Shared mocks:** `tests/support/` - do not put under `lib/`.
- **Client / react-sdk:** use `tests/` when first unit tests land; `tests/e2e/` optional for Playwright later.
