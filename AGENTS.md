# AGENTS.md — Filosign

Cross-package map for agents. **Commands:** [SCRIPTS.md](SCRIPTS.md). **Per-package conventions:** README/AGENTS in table below. **Rules:** [.cursor/rules/](.cursor/rules/) (narrow rule wins on conflict).

## Read first


| Path                    | Docs                                                                      | Role                                                         |
| ----------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/client`           | [AGENTS.md](apps/client/AGENTS.md)                                        | Thin Vite UI → `@filosign/react`                             |
| `apps/server`           | [README](apps/server/README.md)                                           | Hono, Drizzle, `/api/rpc`, `rpc.runtime`                     |
| `apps/contracts`        | [README](apps/contracts/README.md) · [TESTING](apps/contracts/TESTING.md) | Solidity, `definitions/`, EIP-712; tests in `test/`          |
| `apps/astro`            | [README](apps/astro/README.md)                                            | Marketing                                                    |
| `packages/react-sdk`    | [README](packages/react-sdk/README.md)                                    | `FilosignProvider`, typed `rpc`, `rpcQuery`, hooks           |
| `packages/shared`       | [AGENTS.md](packages/shared/AGENTS.md)                                    | Types, Zod, manifests (browser+server)                       |
| `packages/entitlements` | —                                                                         | Plan catalog + pure evaluator (no DB; server wires later)    |
| `packages/crypto-utils` | [README](packages/crypto-utils/README.md)                                 | KEM, WASM-adjacent crypto                                    |
| `packages/test`         | [README](packages/test/README.md)                                         | Dev harness                                                  |
| Scripts / CI            | [SCRIPTS.md](SCRIPTS.md)                                                  | `dev`, `check`, `sanity`, `test`, `build`, `db`, `contracts` |
| Unsure                  | [README.md](README.md)                                                    | Product + repo map                                           |


Multi-package work: read every relevant row, then [Vertical slice](#vertical-slice).


| Rule                                                             | When                                           |
| ---------------------------------------------------------------- | ---------------------------------------------- |
| [contracts-testing.mdc](.cursor/rules/contracts-testing.mdc)     | `apps/contracts/test/` or `src/*.sol`          |
| [preamble.mdc](.cursor/rules/preamble.mdc)                       | Discipline, verify before done                 |
| [apps/web/patterns.mdc](.cursor/rules/apps/web/patterns.mdc)     | `safe`/`tryCatch`, `respond`, Hono `Variables` |
| [app.mdc](.cursor/rules/app.mdc)                                 | Never edit `definitions/` (generated)          |
| [apps/web/api-routes.mdc](.cursor/rules/apps/web/api-routes.mdc) | oRPC routes + client consumption               |


Workspaces: `apps/*`, `packages/*` ([package.json](package.json)).

## Flow

`definitions/` ← deploy ← `.sol` → `getContracts` ([services/contracts.ts](apps/contracts/services/contracts.ts)) → server `[lib/platform/evm.ts](apps/server/lib/platform/evm.ts)` + SDK `[FilosignProvider](packages/react-sdk/src/context/FilosignProvider.tsx)` (`rpc.runtime` → `chainKey` + wagmi) → hooks → client pages. Typed RPC: `[create-orpc-client.ts](packages/react-sdk/src/orpc/create-orpc-client.ts)` → `{apiBase}/api/rpc`. Client shell: `[filosign-provider.tsx](apps/client/src/lib/context/filosign-provider.tsx)` (WASM, wagmi, `VITE_SERVER_URL`). `@filosign/shared` → server, SDK, client; `@filosign/crypto-utils` → SDK, contracts.

## Boundaries

- **HTTP (client):** `useFilosignContext().rpc` + `@filosign/react` hooks only. No `fetch`/axios to JSON API except: blob/doc bytes ([send-envelope.ts](apps/client/src/routes/dashboard/envelope/create/add-sign/send-envelope.ts)), static assets ([compliance-pdf-images.ts](apps/client/src/lib/utils/compliance-pdf/compliance-pdf-images.ts)), **PUT to `storage.presignPut` URLs** (no API body proxy).
- **Logic:** UI `apps/client` | hooks/SDK `packages/react-sdk` | API/DB/relay `apps/server`.
- **Imports:** Client uses minimal `@filosign/contracts` ([constants](apps/client/src/constants.ts)); prefer SDK/runtime for new code.
- **Definitions:** Never hand-edit `apps/contracts/definitions/`. Update via deploy only; `compile` = artifacts/interfaces. **No deploy/migrate without green contract tests** (`migrate` runs test before deploy).

## API & oRPC

Mount: [`api/orpc/hono-mount.ts`](apps/server/api/orpc/hono-mount.ts) (`apiRouter`) — `optionalJwtWalletForOrpc` + hybrid middleware; **JSON API = `/api/rpc`** only ([`router.ts`](apps/server/api/orpc/router.ts) `appRouter`, [handlers](apps/server/api/handlers/)). Domain logic: [`lib/domains/`](apps/server/lib/domains/). Runtime loader: [`lib/domains/runtime`](apps/server/lib/domains/runtime/); shared infra: [`lib/platform/`](apps/server/lib/platform/). Config: [`config.ts`](apps/server/config.ts). Detail: [api-routes.mdc](.cursor/rules/apps/web/api-routes.mdc).

- **Outputs:** Concrete Zod `.output` per procedure in `[api/orpc/schemas/](apps/server/api/orpc/schemas/)` (not `z.unknown()`).
- `**createORPCClient` is a Proxy** — never put `rpc` in TanStack `queryKey`/deep-stringified payloads (use primitives); `JSON.stringify` can hit `toJSON` → bogus RPC.
- **Query utils:** `createFilosignRpcQueryUtils` → `rpcQuery.{users,files,storage,…}` ([rpc-query-utils.ts](packages/react-sdk/src/orpc/rpc-query-utils.ts)).
- **Storage:** Browser PUT to presign URLs; object keys in Postgres; serve via presigned GET (no public bucket URLs on PUT paths).
- **JWT:** Malformed Bearer ignored on `/api/rpc`; protected procedures → `UNAUTHORIZED` via `authenticatedProcedure`.
- **Hono:** `[hono-mount.ts](apps/server/api/orpc/hono-mount.ts)` — `/api/rpc` then `/api/api-reference`; `proxyRawRequest` avoids consumed body.

## Vertical slice

1. Contracts `src` → compile → tests ([TESTING.md](apps/contracts/TESTING.md)) aligned in same PR.
2. Server: oRPC `api/orpc/` + handlers + thin routes + `fsContracts`.
3. SDK: hooks + `useFilosignContext()`.
4. Client: UI only, `@filosign/react`.
5. Verify: [SCRIPTS.md](SCRIPTS.md) — `check`, `test`; contract changes: `bun run sanity` (includes Hardhat) or `bun run sanity -- --fast` without Hardhat.

## Scripts & CI

All commands: **[SCRIPTS.md](SCRIPTS.md)** (or `bun run <script> -- --help`). Pre-push + CI: `bun run sanity` ([ci.yml](.github/workflows/ci.yml)). Local format: `bun run check`. `docs/` is gitignored (local notes only).

## Commits

**Only when the user explicitly asks.** Atomic batches (~≤5 paths). Subject: `[SPRINT] - SUBFEATURE (<area>): description` — brackets = initiative (not package shorthand), e.g. `[CONTRACT TEST SUITE] - Fixtures (apps/contracts): shared deploy helpers`.

## Skills

Use when relevant (`~/.agents/skills/`): **ETHSKILLS** / `~/.cursor/skills/ethskills` (Solidity, onchain) · `/vercel-react-best-practices` (client, SDK) · `/vercel-composition-patterns` (client) · `/frontend-design` (client, astro) · `/web-design-guidelines` (TSX) · `/develop-secure-contracts` (contracts) · `/copywriting` (astro, client) · `/playwright` (E2E). Frontend polish: [impeccable.style](https://impeccable.style/docs/) + [design.mdc](.cursor/rules/apps/web/design.mdc).

Always use Zod v4 schemas: Fetch migration guide from [https://zod.dev/v4/changelog](https://zod.dev/v4/changelog)

## Development stance

Pre-production (solo dev, no users): skip backward-compat and migration shims. Fix root causes; replace legacy code, unused dependencies, comments, and modules—don’t layer around them.