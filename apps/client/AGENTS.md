# AGENTS.md — `apps/client`

Thin Vite UI over [`@filosign/react`](../../packages/react-sdk/README.md). **No direct JSON API** except documented exceptions in root [AGENTS.md](../../AGENTS.md).

## Routing (TanStack Router)

- **URLs:** file-based routes in [`src/routes/`](src/routes/) only. **No `src/pages/`.**
- **One file per route:** put the page component and `export const Route = createFileRoute(...)` in the same **`index.tsx`** (no separate `-page.tsx`).
- **`_` prefix:** pathless layout routes ([docs](https://tanstack.com/router/v1/docs/framework/react/routing/file-naming-conventions)).
- **`-` prefix:** colocated non-route files (`-components/`, `-types.ts`, `-cache.ts`, `-providers.tsx`).
- **`hooks/`:** route-scoped controllers (not picked up by the router).
- **Data:** prefer route `loader` + `pendingComponent` over `useEffect` + imperative `rpc`.

### Route folder layout (per URL)

```
routes/<segment>/.../
  index.tsx          # Page + createFileRoute (single file)
  -components/       # Presentational UI for this route only
  hooks/             # -use-*-controller.ts (logic, no JSX)
  -types.ts          # Zod/types for this flow
  -cache.ts          # rpcQuery invalidation helpers
  -providers.tsx     # Feature Context (wizard / deep tree)
```

### Lift rule (shared vs route-local)

| Used by | Put it in |
|---------|-----------|
| One route tree only | That route folder (`-components/`, `hooks/`, etc.) |
| 2+ unrelated route trees | `lib/components/shared/`, `lib/hooks/`, or `lib/features/<domain>/` |
| Design system | `lib/components/ui/` |
| App infra (providers, wagmi, query client) | `lib/context/` |

**`lib/` must not import from `routes/`.** **`routes/` must not import from deleted `pages/`.**

## UI / logic split (within `index.tsx` or siblings)

| File | Role |
|------|------|
| **`index.tsx`** | Route config + thin composer, or full page if small |
| **`hooks/-use-*-controller.ts`** | Queries, mutations, handlers (**no JSX**) |
| **`-components/*.tsx`** | Markup; local UI state only |
| **Large flows** | Split: keep `index.tsx` as composer calling one controller hook |

Avoid boolean prop walls; use `Pick<Controller, "…">` or route-scoped providers.

## State

| Kind | Tool |
|------|------|
| Server | `@filosign/react` + React Query |
| URL | TanStack Router `search` / `params` |
| Cross-route persist | Zustand (`lib/hooks/use-store.ts`) — minimize |
| Wizard / deep tree | Route-scoped Context (`-providers.tsx`) |
| Dashboard chrome | Pathless layout `dashboard/_shell/` |
| Ephemeral UI | `useState` in leaf `-components` |

Layouts do not fetch; hooks run in route `index.tsx` or `hooks/`.

## Layouts

- `dashboard/route.tsx` — `DashboardProtector` + `Outlet`
- `dashboard/_shell/route.tsx` — `DashboardLayout` (sidebar, nav) + `Outlet`
- Full-bleed routes (envelope, sign, signature create) are **siblings** of `_shell/`, not children

## HTTP

- Use `useFilosignContext().rpc` + SDK hooks.
- Allowed `fetch`: document bytes ([`send-envelope.ts`](src/routes/dashboard/envelope/create/add-sign/send-envelope.ts)), static assets (compliance PDF images).

## Query keys

- Use `rpcQuery.*.key()` — never put `rpc` in keys.

## Commands

See [SCRIPTS.md](../../SCRIPTS.md): `bun run check --filter=@filosign/client`, `bun run test`.
