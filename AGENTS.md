# AGENTS.md — Filosign

Cross-package map for agents. **Commands:** [SCRIPTS.md](SCRIPTS.md). **Per-package conventions:** README/AGENTS in table below. **Rules:** [.cursor/rules/](.cursor/rules/) (narrow rule wins on conflict).

## Read first


| Path                    | Docs                                                                      | Role                                                         |
| ----------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/client`           | [README](apps/client/README.md)                                           | Thin Vite UI → `@filosign/react`                             |
| `apps/server`           | [README](apps/server/README.md)                                           | Hono, Drizzle, `/api/rpc`, `rpc.runtime`                     |
| `apps/contracts`        | [README](apps/contracts/README.md) · [TESTING](apps/contracts/TESTING.md) | Solidity, `definitions/`, EIP-712; tests in `test/`          |
| `apps/astro`            | [README](apps/astro/README.md)                                            | Marketing — landing mocks in `src/components/marketing-mocks/` |
| `packages/react-sdk`    | [README](packages/react-sdk/README.md)                                    | `FilosignProvider`, typed `rpc`, `rpcQuery`, hooks           |
| `packages/shared`       | [AGENTS.md](packages/shared/AGENTS.md)                                    | Types, Zod, manifests (browser+server)                       |
| `packages/entitlements` | —                                                                         | Plan catalog + pure evaluator (no DB; server wires later)    |
| `packages/errors`       | [README](packages/errors/README.md)                                       | User-facing error catalog, `throwAppError`, `presentError`   |
| `packages/crypto-utils` | [README](packages/crypto-utils/README.md)                                 | KEM, WASM-adjacent crypto                                    |
| `packages/motion`       | [README](packages/motion/README.md)                                       | Shared spring physics presets, tweens, and UI layout motion  |
| `packages/test`         | [README](packages/test/README.md)                                         | Dev harness                                                  |
| Scripts / CI            | [SCRIPTS.md](SCRIPTS.md)                                                  | `dev`, `check`, `sanity`, `test`, `build`, `db`, `contracts` |
| Testing                 | [TESTING.md](TESTING.md)                                                  | `tests/` layout, `tests/support/`, grouping rules            |
| Unsure                  | [README.md](README.md)                                                    | Product + repo map                                           |


Multi-package work: read every relevant row, then [Vertical slice](#vertical-slice).


| Rule                                                             | When                                           |
| ---------------------------------------------------------------- | ---------------------------------------------- |
| [contracts-testing.mdc](.cursor/rules/contracts-testing.mdc)     | `apps/contracts/test/` or `src/*.sol`          |
| [preamble.mdc](.cursor/rules/preamble.mdc)                       | Discipline, verify before done                 |
| [apps/web/patterns.mdc](.cursor/rules/apps/web/patterns.mdc)     | `safe`/`tryCatch`, `respond`, Hono `Variables` |
| [app.mdc](.cursor/rules/app.mdc)                                 | Never edit `definitions/` (generated)          |
| [apps/web/api-routes.mdc](.cursor/rules/apps/web/api-routes.mdc) | oRPC routes + client consumption               |
| [TESTING.md](TESTING.md)                                         | `tests/` vs `lib/`, mocks in `tests/support/`  |


Workspaces: `apps/*`, `packages/*` ([package.json](package.json)).

## Flow

`definitions/` ← deploy ← `.sol` → `getContracts` ([services/contracts.ts](apps/contracts/services/contracts.ts)) → server `[lib/platform/evm.ts](apps/server/lib/platform/evm.ts)` + SDK `[FilosignProvider](packages/react-sdk/src/context/FilosignProvider.tsx)` (`rpc.runtime` → `chainKey` + viem wallet from thirdweb) → hooks → client pages. Typed RPC: `[create-orpc-client.ts](packages/react-sdk/src/orpc/create-orpc-client.ts)` → `{apiBase}/api/rpc`. Client shell: `[filosign-provider.tsx](apps/client/src/lib/filosign/filosign-provider.tsx)` (thirdweb, `viemAdapter`, WASM, `VITE_SERVER_URL`). Client conventions: `[apps/client/README.md](apps/client/README.md)`. `@filosign/shared` → server, SDK, client; `@filosign/crypto-utils` → SDK, contracts.

## Boundaries

- **HTTP (client):** `useFilosignContext().rpc` + `@filosign/react` hooks only. No `fetch`/axios to JSON API except: blob/doc bytes ([send-envelope.ts](apps/client/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope.ts)), static assets ([compliance-pdf/utils/images.ts](apps/client/src/lib/domains/files/compliance-pdf/utils/images.ts)), **PUT to `storage.presignPut` URLs** (no API body proxy).
- **Settlements:** Server never custodies USDC. Client `registerRule` + `approve` on-chain; server indexes via **`settlements.registerForFile`**. Sign page **Settle payment** → `settlements.trySettle` (server relay); fallback **Settle from wallet** → `settlements.confirmSettlement`. **Teams Pro:** `updateRule` / `cancelRule` + post-send attach. **`files.amendSigner`** for pre-sign roster changes. Daily cron syncs off-platform `executed` state. See [`lib/domains/settlements/`](apps/server/lib/domains/settlements/) and [`project/settlements/architecture-and-non-custody.md`](project/settlements/architecture-and-non-custody.md).
- **Logic:** UI `apps/client` | hooks/SDK `packages/react-sdk` | API/DB/relay `apps/server`.
- **Imports:** Client uses minimal `@filosign/contracts` ([constants](apps/client/src/constants.ts)); prefer SDK/runtime for new code.
- **Definitions:** Never hand-edit `apps/contracts/definitions/`. Update via deploy only; `compile` = artifacts/interfaces. **No deploy/migrate without green contract tests** (`migrate` runs test before deploy). Redeploy / rebrand ops: [`project/contracts/envelope-registry-migration.md`](project/contracts/envelope-registry-migration.md).
- **Contracts v1 (immutable):** `FSEnvelopeRegistry` + `FSPaymentValidator` only; KMS = `FSEnvelopeRegistry.server`; identity/E2EE off-chain. See `[apps/contracts/ARCHITECTURE.md](apps/contracts/ARCHITECTURE.md)` and `[project/contracts-future-scope.md](project/contracts-future-scope.md)`.

## API & oRPC

Mount: `[api/orpc/hono-mount.ts](apps/server/api/orpc/hono-mount.ts)` (`apiRouter`) — integrations (no session) **then** `optionalThirdwebSessionForOrpc`; **JSON API = `/api/rpc`** only (`[router.ts](apps/server/api/orpc/router.ts)` `appRouter`, [handlers](apps/server/api/handlers/)). Domain logic: `[lib/domains/](apps/server/lib/domains/)`. Runtime loader: `[lib/domains/runtime](apps/server/lib/domains/runtime/)`; shared infra: `[lib/platform/](apps/server/lib/platform/)`. Config: `[config.ts](apps/server/config.ts)`. Detail: [api-routes.mdc](.cursor/rules/apps/web/api-routes.mdc).

- **Outputs:** Concrete Zod `.output` per procedure in `[api/orpc/schemas/](apps/server/api/orpc/schemas/)` (not `z.unknown()`).
- `**createORPCClient` is a Proxy** — never put `rpc` in TanStack `queryKey`/deep-stringified payloads (use primitives); `JSON.stringify` can hit `toJSON` → bogus RPC.
- **Query utils:** `createFilosignRpcQueryUtils` → `rpcQuery.{users,files,storage,…}` ([rpc-query-utils.ts](packages/react-sdk/src/orpc/rpc-query-utils.ts)).
- **Type Safety Flow:** Never strip type safety with loose casts like `(data as { files?: unknown[] })` or `any`. Let oRPC automatic type-safety flow directly from the server schemas down to select functions.
- **Client Type Aliases:** When nested type aliases (like specific row items) are needed on the client, extract them directly from the oRPC contract schemas via `InferClientOutputs<AppRouterClient>` (e.g. `type OrgFileRow = InferClientOutputs<AppRouterClient>["files"]["list"]["org"]["files"][number]`). Do not re-write manual interface duplicates.
- **Storage:** Browser PUT to presign URLs; object keys in Postgres; serve via presigned GET (no public bucket URLs on PUT paths).
- **Session:** thirdweb Bearer + `X-Wallet-Address`; invalid/missing → public procedures only; protected → `UNAUTHORIZED`.
- **Hono:** `[hono-mount.ts](apps/server/api/orpc/hono-mount.ts)` — `/api/rpc` then `/api/api-reference`; `proxyRawRequest` avoids consumed body.

## Vertical slice

1. Contracts `src` → compile → tests ([TESTING.md](apps/contracts/TESTING.md)) aligned in same PR.
2. Server: oRPC `api/orpc/` + handlers + `fsContracts`; `file_settlement_rules` (legs jsonb); register routing on `files.register`; `settlements.registerForFile` / update / cancel; `files.amendSigner`; post-sign + `trySettle` auto-execute; daily cron backfill; compliance v7.
3. SDK: hooks + `useFilosignContext()` (`registerSettlementRulesOnChain`, `buildValidatedRegisterRouting`, `useSettlementsListByFile`, `useTrySettleSettlement`, `useManualSettlementPayout`, `useUpdateSettlementRule`, `useCancelSettlementRule`, `useAmendSigner`).
4. Client: UI only, `@filosign/react` (envelope routing/settlement create, sign-page settle/attach/update/cancel/amend).
5. Verify: [SCRIPTS.md](SCRIPTS.md) — `check`, `test`; contract changes: `bun run sanity` (includes Hardhat) or `bun run sanity -- --fast` without Hardhat.

## Scripts & CI

All commands: **[SCRIPTS.md](SCRIPTS.md)** (or `bun run <script> -- --help`). Pre-push + CI: `bun run sanity` ([ci.yml](.github/workflows/ci.yml)). Local format: `bun run check`. `docs/` is gitignored (local notes only).

## Commits

**Only when the user explicitly asks.** Atomic batches (~≤5 paths or file changes per commit). Subject: `[SPRINT] - SUBFEATURE (<area>): description` — brackets = initiative (not package shorthand), e.g. `[CONTRACT TEST SUITE] - Fixtures (apps/contracts): shared deploy helpers`.

## Skills

Use when relevant (`~/.agents/skills/`): **ETHSKILLS** / `~/.cursor/skills/ethskills` (Solidity, onchain) · `/vercel-react-best-practices` (client, SDK) · `/vercel-composition-patterns` (client) · `/frontend-design` (client, astro) · `/web-design-guidelines` (TSX) · `/develop-secure-contracts` (contracts) · `/copywriting` (astro, client) · `/playwright` (E2E). Frontend polish: [impeccable.style](https://impeccable.style/docs/) + [design.mdc](.cursor/rules/apps/web/design.mdc).

Always use Zod v4 schemas: Fetch migration guide from [https://zod.dev/v4/changelog](https://zod.dev/v4/changelog)

## Domain module layout

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

**Reference:** `[lib/domains/settlements/](apps/server/lib/domains/settlements/)` — `settlements.ts` + `settlements-register.ts` + `utils/{execute-payout,sync-from-chain,verify-rules-on-chain,preflight}.ts`.

**Also refactored:** `[lib/domains/files/](apps/server/lib/domains/files/)` — `piece.ts`, `piece-sign.ts`, `register.ts`, `utils/piece-{detail,compliance}.ts` (handlers re-export only). `[lib/domains/sharing/](apps/server/lib/domains/sharing/)` — `sharing.ts` + `utils/record-share-approval.ts`. Client `[compliance-pdf/](apps/client/src/lib/domains/files/compliance-pdf/)` — `compliance-pdf.ts` + `utils/{draw,summary,build,...}.ts`.

When refactoring an over-split domain: merge related modules into one `utils/` file per concern, keep handlers thin, preserve `index.ts` exports.

## Development stance

Pre-production (solo dev, no users): skip backward-compat and migration shims. Fix root causes; replace legacy code, unused dependencies, comments, and modules—don’t layer around them.