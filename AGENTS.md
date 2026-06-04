# AGENTS.md — Filosign

Cross-package map for agents. **Commands:** [SCRIPTS.md](SCRIPTS.md). **Per-package conventions:** README/AGENTS in table below. **Rules:** [.cursor/rules/](.cursor/rules/) (narrow rule wins on conflict).

## IMPORTANT

Pre-production (solo dev, no users): skip backward-compat and migration shims. Fix root causes; replace legacy code, unused dependencies, comments, and modules—don’t layer around them. Writing minimal code to implement a plan is ideal, followed by a refactor sweep to rebalance and reorganise codebase, aiming for code maintainablity and readability. a balance between number of files vs LOC = sweet spot.

## Read for context


| Path                    | Docs                                                                      | Role                                                           |
| ----------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `apps/client`           | [README](apps/client/README.md)                                           | Thin Vite UI → `@filosign/react`                               |
| `apps/server`           | [README](apps/server/README.md)                                           | Hono, Drizzle, `/api/rpc`, `rpc.runtime`                       |
| `apps/contracts`        | [README](apps/contracts/README.md) · [TESTING](apps/contracts/TESTING.md) | Solidity, `definitions/`, EIP-712; tests in `test/`            |
| `apps/astro`            | [README](apps/astro/README.md)                                            | Marketing — landing mocks in `src/components/marketing-mocks/` |
| `packages/react-sdk`    | [README](packages/react-sdk/README.md)                                    | `FilosignProvider`, typed `rpc`, `rpcQuery`, hooks             |
| `packages/shared`       | [AGENTS.md](packages/shared/AGENTS.md)                                    | Types, Zod, manifests (browser+server)                         |
| `packages/entitlements` | —                                                                         | Plan catalog + pure evaluator (no DB; server wires later)      |
| `packages/errors`       | [README](packages/errors/README.md)                                       | User-facing error catalog, `throwAppError`, `presentError`     |
| `packages/crypto-utils` | [README](packages/crypto-utils/README.md)                                 | KEM, WASM-adjacent crypto                                      |
| `packages/motion`       | [README](packages/motion/README.md)                                       | Shared spring physics presets, tweens, and UI layout motion    |
| `packages/test`         | [README](packages/test/README.md)                                         | Dev harness                                                    |
| Scripts / CI            | [SCRIPTS.md](SCRIPTS.md)                                                  | `dev`, `check`, `sanity`, `test`, `build`, `db`, `contracts`   |
| Testing                 | [TESTING.md](TESTING.md)                                                  | `tests/` layout, `tests/support/`, grouping rules              |
| Unsure                  | [README.md](README.md)                                                    | Product + repo map                                             |


Multi-package work: read every relevant row, then [Vertical slice](#vertical-slice).


| Rule                                                                                 | When                                                     |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| [contracts-testing.mdc](.cursor/rules/contracts-testing.mdc)                         | `apps/contracts/test/` or `src/*.sol`                    |
| [preamble.mdc](.cursor/rules/preamble.mdc)                                           | Discipline, verify before done                           |
| [apps/web/patterns.mdc](.cursor/rules/apps/web/patterns.mdc)                         | `safe`/`tryCatch`, `respond`, Hono `Variables`           |
| [app.mdc](.cursor/rules/app.mdc)                                                     | Never edit `definitions/` (generated)                    |
| [apps/web/api-routes.mdc](.cursor/rules/apps/web/api-routes.mdc)                     | oRPC routes + client consumption                         |
| [TESTING.md](TESTING.md)                                                             | `tests/` vs `lib/`, mocks in `tests/support/`            |
| [sprint-implementation-rulebook.md](.cursor/plans/sprint-implementation-rulebook.md) | Server infra Sprints 0–6 — layout, TDD, replace-not-shim |


Workspaces: `apps/*`, `packages/*` ([package.json](package.json)).

## Flow

`definitions/` ← deploy ← `.sol` → `getContracts` ([services/contracts.ts](apps/contracts/services/contracts.ts)) → server `[lib/platform/evm.ts](apps/server/lib/platform/evm.ts)` + SDK `[FilosignProvider](packages/react-sdk/src/context/FilosignProvider.tsx)` (`rpc.runtime` → `chainKey` + viem wallet from thirdweb) → hooks → client pages. Typed RPC: `[create-orpc-client.ts](packages/react-sdk/src/orpc/create-orpc-client.ts)` → `{apiBase}/api/rpc`. Client shell: `[filosign-provider.tsx](apps/client/src/lib/filosign/filosign-provider.tsx)` (thirdweb, `viemAdapter`, WASM, `VITE_SERVER_URL`). Client conventions: `[apps/client/README.md](apps/client/README.md)`. `@filosign/shared` → server, SDK, client; `@filosign/crypto-utils` → SDK, contracts.

## Boundaries

- **HTTP (client):** `useFilosignContext().rpc` + `@filosign/react` hooks only. No `fetch`/axios to JSON API except: blob/doc bytes ([send-envelope.ts](apps/client/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope.ts)), static assets ([compliance-pdf/utils/images.ts](apps/client/src/lib/domains/files/compliance-pdf/utils/images.ts)), **PUT to `storage.presignPut` URLs** (no API body proxy).
- **Settlements:** Server never custodies USDC. Client `registerRule` + `approve` on-chain; server indexes via `**settlements.registerForFile`**. Sign page Settle payment → `settlements.trySettle` (server relay); fallback Settle from wallet → `settlements.confirmSettlement`. Teams Pro: `updateRule` / `cancelRule` + post-send attach. `**files.proposeSignerReplacement` / `executeSignerReplacement` / `cancelSignerReplacement`** for signer swaps (pending + re-sign when partially signed). Daily cron syncs off-platform `executed` state. See `[lib/domains/settlements/](apps/server/lib/domains/settlements/)` and `[project/settlements/architecture-and-non-custody.md](project/settlements/architecture-and-non-custody.md)`.
- **Logic:** UI `apps/client` | hooks/SDK `packages/react-sdk` | API/DB/relay `apps/server`.
- **Imports:** Client uses minimal `@filosign/contracts` ([constants](apps/client/src/constants.ts)); prefer SDK/runtime for new code.
- **Definitions:** Never hand-edit `apps/contracts/definitions/`. Update via deploy only; `compile` = artifacts/interfaces. **No deploy/migrate without green contract tests** (`migrate` runs test before deploy). Redeploy / rebrand ops: `[project/contracts/envelope-registry-migration.md](project/contracts/envelope-registry-migration.md)`.
- **Contracts v1 (immutable):** `FSEnvelopeRegistry` + `FSPaymentValidator` only; KMS = `FSEnvelopeRegistry.server`; identity/E2EE off-chain. See `[apps/contracts/ARCHITECTURE.md](apps/contracts/ARCHITECTURE.md)` and `[project/contracts-future-scope.md](project/contracts-future-scope.md)`.

## API & oRPC

Mount: `[api/orpc/hono-mount.ts](apps/server/api/orpc/hono-mount.ts)` (`apiRouter`) — integrations (no session) **then** `optionalThirdwebSessionForOrpc`; **JSON API = `/api/rpc`** only (`[router.ts](apps/server/api/orpc/router.ts)` `appRouter`, [handlers](apps/server/api/handlers/)). Domain logic: `[lib/domains/](apps/server/lib/domains/)`. Runtime loader: `[lib/domains/runtime](apps/server/lib/domains/runtime/)`; shared infra: `[lib/platform/](apps/server/lib/platform/)`. Config: `[config.ts](apps/server/config.ts)`. Detail: [api-routes.mdc](.cursor/rules/apps/web/api-routes.mdc).

- **Outputs:** Concrete Zod `.output` per procedure in `[api/orpc/schemas/](apps/server/api/orpc/schemas/)` (not `z.unknown()`).
- `**createORPCClient` is a Proxy** — never put `rpc` in TanStack `queryKey`/deep-stringified payloads (use primitives); `JSON.stringify` can hit `toJSON` → bogus RPC.
- **Query utils:** `createFilosignRpcQueryUtils` → `rpcQuery.{users,files,storage,…}` ([rpc-query-utils.ts](packages/react-sdk/src/orpc/rpc-query-utils.ts)).
- **Types:** Follow [Zod v4 & types](#zod-v4--types) — infer from schemas end-to-end; no loose casts or duplicate interfaces.
- **Storage:** Browser PUT to presign URLs; object keys in Postgres; serve via presigned GET (no public bucket URLs on PUT paths).
- **Session:** thirdweb Bearer + `X-Wallet-Address`; invalid/missing → public procedures only; protected → `UNAUTHORIZED`.
- **Hono:** `[hono-mount.ts](apps/server/api/orpc/hono-mount.ts)` — `/api/rpc` then `/api/api-reference`; `proxyRawRequest` avoids consumed body.

## Vertical slice

1. Contracts `src` → compile → tests ([TESTING.md](apps/contracts/TESTING.md)) aligned in same PR.
2. Server: oRPC `api/orpc/` + handlers + `fsContracts`; `file_settlement_rules` (legs jsonb); register routing on `files.register`; `settlements.registerForFile` / update / cancel; `files.proposeSignerReplacement` (+ execute/cancel); post-sign + `trySettle` auto-execute; daily cron backfill; compliance bundle v1.
3. SDK: hooks + `useFilosignContext()` (`registerSettlementRulesOnChain`, `buildValidatedRegisterRouting`, `useSettlementsListByFile`, `useTrySettleSettlement`, `useManualSettlementPayout`, `useUpdateSettlementRule`, `useCancelSettlementRule`, `useProposeSignerReplacement`, `useExecuteSignerReplacement`, `useCancelSignerReplacement`).
4. Client: UI only, `@filosign/react` (envelope routing/settlement create, sign-page settle/attach/update/cancel/amend).
5. Verify: [SCRIPTS.md](SCRIPTS.md) — `check`, `test`; contract changes: `bun run sanity` (includes Hardhat) or `bun run sanity -- --fast` without Hardhat.

## Scripts & CI

All commands: **[SCRIPTS.md](SCRIPTS.md)** (or `bun run <script> -- --help`). Pre-push + CI: `bun run sanity` ([ci.yml](.github/workflows/ci.yml)). Local format: `bun run check`. `docs/` is gitignored (local notes only).

## Commits

**Only when the user explicitly asks.** Atomic batches (~≤5 paths or file changes per commit). Subject: `[SPRINT] - SUBFEATURE (<area>): description` — brackets = initiative (not package shorthand), e.g. `[CONTRACT TEST SUITE] - Fixtures (apps/contracts): shared deploy helpers`.

## Skills

Use when relevant (`~/.agents/skills/`): **ETHSKILLS** / `~/.cursor/skills/ethskills` (Solidity, onchain) · `/vercel-react-best-practices` (client, SDK) · `/vercel-composition-patterns` (client) · `/frontend-design` (client, astro) · `/web-design-guidelines` (TSX) · `/develop-secure-contracts` (contracts) · `/copywriting` (astro, client) · `/playwright` (E2E). Frontend polish: [impeccable.style](https://impeccable.style/docs/) + [design.mdc](.cursor/rules/apps/web/design.mdc).

## Zod v4 & types

Monorepo uses **Zod 4** (`catalog`). [v4 changelog](https://zod.dev/v4/changelog).

**Syntax (v4, not v3):**

- Top-level formats: `z.email()`, `z.url()`, `z.uuid()`, `z.iso.datetime()` — not `z.string().email()` / `.url()` / `.uuid()` / `.datetime()`.
- Validation messages: `{ error: "…" }` on `.min()` / refinements — not a positional string, `invalid_type_error`, `required_error`, or `errorMap`.
- `z.record(keySchema, valueSchema)` — always two arguments.
- Server parse errors: [`zodSafeParseMessage`](apps/server/lib/platform/utils/zodHttp.ts) (`z.treeifyError`) — not `.flatten()` / `.format()` on `ZodError`.

**Where schemas live:**

- **Shared wire shapes:** `@filosign/shared` (e.g. `zPlacementManifest`, `zDraftPlacementManifest`, `zSettlementReleaseParams`, `zUserKeygenDataJson`, `zAttachmentPacketSendInput`) — extend here when client + server agree.
- **Domain/handlers:** `export` Zod next to the `safeParse` that uses it (`lib/domains/*`, `api/handlers/*`).
- **oRPC contract:** concrete `.input` / `.output` in [`apps/server/api/orpc/schemas/`](apps/server/api/orpc/schemas/) — wire router from [`procedure-inputs.ts`](apps/server/api/orpc/schemas/procedure-inputs.ts) or schema re-exports; never `z.unknown()`, `z.any()`, `.passthrough()`, or `.loose()` on procedure I/O.
- **DB jsonb:** Drizzle `$type<…>` must match the same Zod shape you parse at runtime.

**TypeScript (no parallel type systems):**

- Client/SDK: `InferClientInputs<AppRouterClient>` / `InferClientOutputs<AppRouterClient>` for procedure shapes — do not hand-write duplicate interfaces.
- No `(data as { files?: unknown[] })`, `any`, or widening RPC outputs after the fact; let oRPC inference flow through hooks and `select`.
- Prefer `z.infer<typeof schema>` (or shared exported types) over duplicating object shapes in TS.

## TypeScript

Strict mode everywhere. [TS handbook — Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html).

**Do:**

- Primitives: `string`, `number`, `boolean`, `bigint` — never boxed `String` / `Number` / `Boolean`.
- Unknown JSON at boundaries: `unknown` + narrow (`safeParse`, type guards) — not `any`.
- oRPC / Zod: infer types; export row aliases from `InferClientOutputs` / `InferClientInputs` (see [Zod v4 & types](#zod-v4--types)).
- viem: `Address`, `Hex` from schema/`zHexString`/`zEvmAddress` — `as Address` only on values already validated or from wallet context.
- Callbacks that ignore return values: `() => void`, not `() => any`.

**Don't:**

- `@ts-ignore` / `@ts-expect-error` except documented third-party gaps (e.g. bigint JSON, WASM); fix root cause first.
- `as unknown as T` to silence mismatches — fix the model (e.g. optional `bytes` vs `size` on persisted draft files).
- `Record<string, unknown>` for typed RPC bodies, admin rows, or manifests when a concrete schema exists.
- `.passthrough()` / `.loose()` Zod objects for production API contracts.
- Re-declaring overloads that differ only in optional trailing args — use optional parameters or unions instead.

**Wire parsers (`@filosign/shared`):** `parseEvmAddress` / `parseHexString` at crypto and wallet boundaries when inference is still `string`.

**Server relay writes:** `relayContractWrite<T>(contract.write)` in [`lib/platform/evm/contract-write.ts`](apps/server/lib/platform/evm/contract-write.ts) — one documented bridge for viem typings that omit registry/release methods.

**SDK wallet:** `walletAccountAddress(account)` from [`packages/react-sdk/src/utils/evm.ts`](packages/react-sdk/src/utils/evm.ts).

**Legitimate casts (keep narrow):** generated `definitions/` index, dynamic WASM `import()`, test mocks in `apps/server/tests/support/`, literal `0x…` constants with `satisfies Hex`.

## Refactoring Guide

**Goal:** Middle ground between one giant file and dozens of one-function files — a **feature folder** with a thin public surface and scoped internals (same idea as `[apps/client/src/lib/web3/](apps/client/src/lib/web3/)`).

**Where:** `[apps/server/lib/domains/<feature>/](apps/server/lib/domains/)` (and similar colocated trees in client/SDK when a feature outgrows one file).

**Shape:**


| Piece                 | Role                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `index.ts`            | Stable exports for handlers and other packages — only what callers need                                     |
| `<feature>.ts`        | Thin facade: oRPC/domain entrypoints, auth, cron hooks, orchestration                                       |
| `<feature>-<flow>.ts` | Optional second top-level file only when a distinct lifecycle exists (e.g. register vs runtime)             |
| `utils/`              | **Big or reusable** chunks only — chain sync, relay, heavy validation (~100+ lines or shared by 2+ callers) |


**Avoid:** One file per tiny helper; repo-root `utils/` dumps; duplicating exports from both `index` and implementation files.

**Reference:** `[lib/domains/settlements/](apps/server/lib/domains/settlements/)` — `settlements.ts` + `register.ts` + `crud.ts` + `utils/{execute-payout,sync-from-chain,verify-rules-on-chain,preflight,db-sync,entitlements}.ts`.

**Also refactored:** `[lib/domains/files/](apps/server/lib/domains/files/)` — `piece.ts`, `sign.ts`, `register.ts`, `detail.ts`, `draft.ts`, `invites.ts`, `utils/{piece-helpers,register-helpers}.ts`.

When refactoring an over-split domain: merge related modules into one `utils/` file per concern, keep handlers thin, preserve `index.ts` exports.

### File Naming & Directory Hierarchy Conventions

> [!IMPORTANT]
> **NO REDUNDANT PREFIXES:** Do not prefix files with their parent directory or package name. Leverage the directory hierarchy to keep filenames short and clean.
> - **Wrong:** `<parent>/<parent>-<submodule>.ts` (e.g., `billing/billing-plans.ts`, `hooks/users/useSyncThirdwebEmail.ts`)
> - **Right:** `<parent>/<submodule>.ts` or `<parent>/utils/<submodule>.ts` (e.g., `billing/utils/plans.ts`, `hooks/users/useSyncEmail.ts`)
> 
> **GROUPING & NESTING:** Group related sub-modules logically. Use subfolders (e.g. `utils/`) rather than flat, cluttered naming conventions. Keep the root of any package or domain directory clean, exposing only primary facades/indices and entry points.