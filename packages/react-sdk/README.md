# `@filosign/react`

React SDK: **`FilosignProvider`**, typed **oRPC**, TanStack Query hooks, wallet/session/crypto. Primary consumer: **`apps/client`** (thin UI; logic lives here).

> **Audience:** contributors and AI agents. Read this before adding hooks, exports, or client API wiring.

## Quick rules

1. **API hooks:** `useFilosignRpc()` + `rpcQuery.*.queryOptions()` / `.call()`; `enabled: isAuthed` (or document public procedures).
2. **Invalidate:** `rpcQuery.<domain>.<procedure>.key()` (or parent `.key()`); grouped helpers in `@filosign/react/invalidate-queries`. **`filosignKeys`** / **`filosignQueryRoots`** (`@filosign/react/query-keys`) for wallet, on-chain, session, and derived client queries—not hand-rolled oRPC strings.
3. **Apps:** import `@filosign/react/{auth,files,sharing,users}` (+ `/utils`, `/runtime` if needed)—no `/hooks` barrel, no `@filosign/react/src/...`, no `fetch` to `/api/rpc`.
4. **Changes:** server procedure first → hook in matching `src/hooks/<domain>/` → client import → `turbo run check-types --filter=@filosign/client`.
5. **Never** put `rpc` inside a `queryKey` (proxy + `JSON.stringify` hazard—see root [`AGENTS.md`](../../AGENTS.md)).

Deeper context: [`AGENTS.md`](../../AGENTS.md), [api-routes.mdc](../../.cursor/rules/apps/web/api-routes.mdc).

---

## Monorepo role

| Package | Role |
|---------|------|
| [`apps/server`](../../apps/server) | API source of truth—[`api/orpc/router.ts`](../../apps/server/api/orpc/router.ts); types via [`app-router-types.ts`](src/orpc/app-router-types.ts) (`AppRouterClient`). Prefer concrete `.output` schemas in `api/orpc/schemas/`. |
| [`@filosign/shared`](../../packages/shared) | Zod, commitments, pure helpers—not HTTP. |
| [`@filosign/crypto-utils`](../../packages/crypto-utils) | KEM, Dilithium, encryption inside hooks. |
| [`@filosign/contracts`](../../apps/contracts) | `getContracts`, EIP-712; on-chain via context `contracts`. |
| [`apps/client`](../../apps/client) | Wraps provider ([`filosign-provider.tsx`](../../apps/client/src/lib/filosign/filosign-provider.tsx)): `apiBaseUrl`, viem `wallet` from thirdweb, `wasm.dilithium`. `ready` after `runtime` + `chainKey`. |

**Owns:** browser RPC, React Query hooks, session seed, provider, **client PostHog** (`src/analytics/`). **Not:** Hono/DB, contracts source, page UI.

**Analytics:** `FilosignAnalyticsProvider`, `useCaptureAppEvent`, `CLIENT_ANALYTICS_EVENTS` — see [`apps/server/lib/platform/analytics/`](../../apps/server/lib/platform/analytics/) (full catalog: server + client events).

---

## Public exports

| Subpath | Purpose |
|---------|---------|
| `@filosign/react` | `FilosignProvider`, `useFilosignContext` (`rpc`, `rpcQuery`, `session`, `contracts`, `runtime`, `wallet`, `wasm`) |
| `@filosign/react/auth` | Login, logout, `useAuthedApi`, registration, recovery |
| `@filosign/react/files` | Documents, cold invite, sign/ack/view/send, register routing (`useSendFile` + `routing`), signer replacement (`useProposeSignerReplacement`, `useExecuteSignerReplacement`, `useCancelSignerReplacement`), settlements (`useSettlementsListByFile`, `useTrySettleSettlement`, `useManualSettlementPayout`, `useUpdateSettlementRule`, `useCancelSettlementRule`) |
| `@filosign/react/sharing` | Connections, approvals, requests |
| `@filosign/react/users` | Profile, Thirdweb email, lookup |
| `@filosign/react/runtime` | `useRuntimeChain` |
| `@filosign/react/utils` | Piece CID, cold-invite envelope, crypto helpers |

`useFilosignRpc` is **internal** (hooks import from `src/lib/`); apps use domain hooks only.

---

## Data flow

```mermaid
flowchart TB
  UI[apps/client UI] --> HK[Domain hooks]
  HK --> UFR[useFilosignRpc]
  UFR --> rpcQ[rpcQuery]
  UFR --> authed[useAuthedApi]
  FP[FilosignProvider] --> CTX[useFilosignContext]
  CTX --> rpcQ
  CTX --> rpc[rpc]
  rpc --> API["server /api/rpc"]
  FP --> runtime[runtime + getContracts]
```

1. Provider loads **`runtime`** (`rpcQuery.runtime`), then **`getContracts({ chainKey })`**.
2. **`FilosignSession`** holds the thirdweb auth token; app passes `useAuthToken()` via `thirdwebAuthToken` on the provider.
3. **`useAuthedApi`:** wallet + thirdweb token + registered user → RPC headers (`Bearer` + `X-Wallet-Address`).
4. **`useLogout`** clears local seed + session token (wallet disconnect is separate).
5. **`useCryptoUnlocked`** — in-memory seed for decrypt/sign (lazy unlock).
6. Feature hooks: **`useFilosignRpc()`** → `rpcQuery` + `isAuthed`.

TanStack helpers: [`src/orpc/rpc-query-utils.ts`](src/orpc/rpc-query-utils.ts) (`["filosign", …]` prefix).

---

## `rpcQuery` patterns

### Query

```ts
const { rpcQuery, isAuthed } = useFilosignRpc();

return useQuery({
  ...rpcQuery.users.profile.me.queryOptions(),
  enabled: isAuthed,
  staleTime: 1 * DAY,
  select: (data) => data.someField, // optional
});
```

Types: `InferClientOutputs<AppRouterClient>["users"]["profile"]["me"]`.

### Mutation

Custom `mutationFn` when adding crypto, EIP-712, or presigned `fetch`. Call **`rpcQuery.<path>.call(input)`**.

```ts
return useMutation({
  mutationFn: async (args) => {
    if (!isAuthed) throw new Error("Not authenticated");
    return rpcQuery.users.profile.update.call(payload);
  },
  onSuccess: () => invalidateUser(),
});
```

If `mutate` takes a different shape than procedure input (e.g. `string` vs `{ id }`), **do not** spread `...mutationOptions()`—use explicit `mutationFn` + `.call()`.

### Cache keys ([`filosignKeys`](src/lib/query-keys.ts))

Non-RPC only: `useAuthedApi`, `useIsLoggedIn`, `useIsRegistered`, `useStoredKeygenData`.

---

## Edge cases (not plain `queryOptions`)

| Case | Pattern |
|------|---------|
| API session | [`useAuthedApi`](src/hooks/auth/useAuthedApi.ts) |
| Crypto unlock | [`useCryptoUnlocked`](src/hooks/auth/useCryptoUnlocked.ts) |
| On-chain | `contracts.*.read` |
| Session seed | In-memory [`session-seed.ts`](src/hooks/auth/session-seed.ts)—never `sessionStorage` |
| Uploads | `rpcQuery.storage.presignPut.call` → **`fetch` PUT** to URL |
| File bytes | Presigned GET / Filecoin in `useViewFile` |
| Composite | e.g. `useAcceptedPeople`—multiple `.call` in one `queryFn` |
| Profile email | Keep **separate** RPCs/hooks: `profile.update` (fields/avatar), `syncThirdwebEmail`, `setPrimaryEmail`; shared `useInvalidateUserProfile()` |

---

## Hook checklist

1. Add/update procedure + Zod output on server.
2. Hook under `src/hooks/{auth,files,sharing,users}/`; export from domain `index.ts` if apps need it.
3. `useFilosignRpc` + `rpcQuery`; gate with `isAuthed` unless public.
4. Invalidate with `rpcQuery.*.key()` or `filosignKeys` as appropriate.
5. Client: `@filosign/react/<domain>` only.
6. `turbo run check-types --filter=@filosign/react`; `bun run check:ci` (or scoped Biome on changed paths).

---

## v1 contracts slice (`@filosign/react/files`)

### Send + register routing

`useSendFile` accepts optional `routing?: RegisterRoutingInput` (from `@filosign/shared`). The SDK builds validated routing calldata, signs EIP-712 v2 `RegisterEnvelope` with routing hashes, and passes `routing` to `files.register`. Timestamps use latest chain block time.

Helpers: `buildValidatedRegisterRouting`, `canUseAdvancedRouting` (entitlement pre-check for UI).

### Settlements

`SettlementRuleDraft` uses `legs[]` (1–32), all nine release types, and optional `expiresAt`.

| Hook | Server + chain |
|------|----------------|
| `useSendFile` + `registerSettlementRulesOnChain` | register + index |
| `useSettlementsListByFile` | list |
| `useTrySettleSettlement` | relay execute |
| `useManualSettlementPayout` | wallet execute + confirm |
| `useUpdateSettlementRule` | update + index |
| `useCancelSettlementRule` | cancel + index |
| `useRevokeSettlementAllowance` | ERC-20 approve(0) |
| `useProposeSignerReplacement` | propose signer swap (+ E2EE payload) |
| `useExecuteSignerReplacement` | apply pending swap (clears on-chain sigs) |
| `useCancelSignerReplacement` | cancel pending swap |

On-chain helpers exported from `@filosign/react/files`: `registerSettlementRulesOnChain`, `updateSettlementRuleOnChain`, `cancelSettlementRuleOnChain`, etc.

---

## Anti-patterns (not covered above)

| Avoid | Instead |
|-------|---------|
| `z.parse` on RPC when router has `.output` | `InferClientOutputs<AppRouterClient>` |
| Exporting internals (`useStoredKeygenData`) | Keep module-private unless apps require |
| God hook / merged profile RPC | Separate hooks per procedure semantics |
| Re-exporting server handlers | Types via `app-router-types.ts` only |

---

## Layout

```
index.ts              # Provider + context
package.json          # domain exports
src/context/          # FilosignProvider
src/orpc/             # client, rpc-query-utils, AppRouterClient
src/hooks/{auth,files,sharing,users}/
src/lib/              # use-filosign-rpc, query-keys, invalidate-queries, invalidate-user-profile
src/utils/
src/constants.ts      # DAY, MINUTE
```

No package-level `test` script yet—rely on client typecheck and manual flows.

---

## Auth

- API session = thirdweb embedded-wallet token verified server-side (Dragonfly cache).
- Crypto unlock = separate in-memory seed (`useLogin` / recovery phrase); not required for dashboard list/metadata.
