# PostHog analytics

Filosign sends **custom product events** to PostHog for funnels, retention, and debugging. This document is the event catalog and how to use it in PostHog.

**Not in PostHog:** billing limits, entitlements, admin invite totals — those live in Postgres and `metrics.*` oRPC.

---

## Quick start

Use one PostHog project for both apps (same API key).

| App | Env file | Variables |
| --- | --- | --- |
| Server | `apps/server/.env.local` | `POSTHOG_ENABLED=true`, `POSTHOG_API_KEY`, optional `POSTHOG_HOST` (default `https://us.i.posthog.com`) |
| Client | `apps/client/.env.local` | `VITE_POSTHOG_ENABLED=true`, `VITE_POSTHOG_KEY`, optional `VITE_POSTHOG_HOST` |

Server events include `properties.chain` (`local` / `testnet` / `mainnet`). Filter on that in PostHog to separate dev from production.

---

## How tracking works

### Persons (wallets)

| Source | `distinct_id` |
| --- | --- |
| Server | Wallet address, lowercased |
| Client | Anonymous id until login, then wallet (via `useIdentifyAnalyticsWallet` in `DashboardProtector`) |

Sender and signer are **different people** in PostHog. Do not alias or merge their wallets.

### Envelopes (`piece_cid`)

Many events belong to one document envelope (IPFS piece CID). Those events include:

| Mechanism | Purpose |
| --- | --- |
| Property `piece_cid` | Works on every PostHog plan — filter, breakdown, HogQL |
| Group `envelope` | Same CID as group key; enables **group funnels** when Group analytics is enabled on your PostHog plan |

**Server:** pass `pieceCid` to `trackServerEvent` ([`apps/server/lib/analytics/envelope.ts`](apps/server/lib/analytics/envelope.ts)).

**Client:** pass `piece_cid` in event properties when the CID is known; [`packages/react-sdk/src/analytics/context.tsx`](packages/react-sdk/src/analytics/context.tsx) also calls `posthog.group("envelope", …)` so group data is ready when you upgrade PostHog.

### Global properties (server only)

Every server event includes `chain` and `service: "filosign-server"`.

### Client defaults

In `FilosignAnalyticsProvider`: autocapture, pageviews, pageleave, and **session replay** are **disabled** — only listed client events are sent.

Wallet sign-in must go through [`useThirdwebLogin`](apps/client/src/lib/hooks/use-thirdweb-login.ts) (thirdweb Connect modal) so first-time wallet connects emit `wallet_signup`.

---

## Repository layout

| Path | Contents |
| --- | --- |
| [`apps/server/lib/analytics/`](apps/server/lib/analytics/) | `posthog-node`, `trackServerEvent`, `SERVER_ANALYTICS_EVENTS` |
| [`packages/react-sdk/src/analytics/`](packages/react-sdk/src/analytics/) | Provider, hooks, `CLIENT_ANALYTICS_EVENTS` |

Event names are defined in each package’s `events.ts`. Keep names stable; PostHog funnels reference them by string.

---

## Server events

Defined in [`apps/server/lib/analytics/events.ts`](apps/server/lib/analytics/events.ts). Emitted with `trackServerEvent` from API handlers and jobs.

| Event | Person (`distinct_id`) | `piece_cid` | When | Properties |
| --- | --- | --- | --- | --- |
| `user_registered` | Registrant | — | Filosign keygen registration completes | `entry`: `organic` \| `dev` |
| `file_registered` | Sender | ✓ | File/envelope registered | `signer_count`, `cold_invite_count`, `warm_participant_count`, `recipient_slot_count` |
| `cold_invite_created` | Sender | ✓ | Same request, if cold invites exist | `cold_invite_count` |
| `cold_invite_claimed` | Claimant | ✓ | Cold invite claimed (also emits `piece_acknowledged` `mode=cold`) | `is_signer` |
| `cold_invite_expired` | `system` | ✓ | Cron expires one invite row | `invite_id` |
| `sharing_invite_claimed` | Wallet | — | Warm sharing invite claimed | — |
| `piece_acknowledged` | Recipient/signer | ✓ | Piece acknowledged (warm: ack API; cold: same request as claim) | `mode`: `cold` \| `warm` |
| `piece_signed` | Signer | ✓ | Signing completes | `field_count` |
| `envelope_fully_signed` | Sender | ✓ | All required signatures done | — |

**Cold flow — two wallets, one `piece_cid`:**

```
Sender:  cold_invite_created  →  …  →  envelope_fully_signed
Signer:  cold_invite_claimed  →  piece_acknowledged  →  piece_signed
```

---

## Client events

Defined in [`packages/react-sdk/src/analytics/events.ts`](packages/react-sdk/src/analytics/events.ts). Emitted with `useCaptureAppEvent()` from `apps/client`.

| Event | `piece_cid` | When | Properties |
| --- | --- | --- | --- |
| `wallet_signup` | — | First thirdweb wallet connect in session (`useThirdwebLogin`) | — |
| `onboarding_completed` | If cold-invite URL | Welcome step done | — |
| `envelope_compose_submitted` | — | Create step submitted | `recipient_count` |
| `envelope_send_clicked` | — | Send started | `recipient_count` |
| `envelope_send_succeeded` | From API response | Send succeeds | `had_cold_recipients` |
| `cold_share_dialog_shown` | — | Cold share dialog opens | — |
| `cold_invite_mismatch_shown` | — | *(constant exists; not emitted yet)* | — |

---

## Building insights in PostHog

### Person-level funnels (no Group analytics required)

Use **Unique users** aggregation. Each funnel follows one wallet through its steps.

**Signer — claim to sign**

1. `cold_invite_claimed`
2. `piece_acknowledged` (`mode = cold` on claim, or `mode = warm` via ack API)
3. `piece_signed`

Do not start with `cold_invite_created` (that event is on the sender).

**Sender — cold send to completion**

1. `cold_invite_created`
2. `envelope_fully_signed`

**New user — wallet → Filosign setup**

1. `wallet_signup` (client)
2. `onboarding_completed` (optional cold `piece_cid`)
3. `user_registered` (server, after keygen)

**Invite volume**

Trends: compare event counts for `cold_invite_created` vs `cold_invite_claimed` (not a single-user funnel).

**Common mistake:** one funnel `cold_invite_created` → `cold_invite_claimed` with “Same user” will show ~0% conversion even when the product works, because step 1 is the sender and step 2 is the signer.

### Per-envelope lifecycle (works on any plan)

Filter or break down by **`properties.piece_cid`** to follow one envelope across both wallets:

- Live events → search `piece_cid = <cid>`
- HogQL: constrain all steps with `properties.piece_cid = '<cid>'`
- Trends: unique `piece_cid` counts for `envelope_fully_signed`

### Group funnels (PostHog Group analytics — paid tier)

The app already sends group type **`envelope`** with key = `piece_cid`. To use **Funnels → aggregated by Group**:

1. In PostHog: **Project settings → Group analytics** → create group type **`envelope`** (label e.g. “Envelope”).
2. Create a funnel with steps: `cold_invite_created` → `cold_invite_claimed` → `piece_acknowledged` → `piece_signed` → `envelope_fully_signed`.
3. Set aggregation to **Group** → **`envelope`** (not “Unique users”).
4. Filter `chain` for the environment you care about.

Until Group analytics is on your plan, use `piece_cid` property filters above — same data, manual or HogQL.

---

## Adding a new event

1. Add the name to `SERVER_ANALYTICS_EVENTS` or `CLIENT_ANALYTICS_EVENTS`.
2. Emit from the handler or UI (`trackServerEvent` / `useCaptureAppEvent`).
3. For envelope-scoped server events, pass `pieceCid` so `piece_cid` and group `envelope` are set automatically.
4. Update this file’s table.
5. Optionally define the event in PostHog **Data management** for clearer funnel pickers.

---

## Related

- Server ops (cold invite cron): [`apps/server/README.md`](apps/server/README.md)
- React SDK: [`packages/react-sdk/README.md`](packages/react-sdk/README.md)
