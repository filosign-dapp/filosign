# FOC storage lifecycle (parent dependency)

Org-wide archival billing ([archival pricing catalog](../../.cursor/plans/archival_pricing_catalog_16ebb344.plan.md)) is a **separate** product from workspace SaaS. See also [FOC parallel backup plan](../../.cursor/plans/foc_parallel_backup_125e4207.plan.md).

## Two products (do not conflate)

| Product | What it does |
|---------|----------------|
| **Paid workspace** (Solo / Teams) | **FOC platform backup** after envelope **completion** (all signers signed) — independent of archival SKU |
| **Archival SKU** (Dodo, org-wide) | **Extends** Filecoin payment runway on **replicated** `foc_objects` — never the trigger for first upload |

**Free** workspace: R2 only; no `foc_objects` stub.

### R2 hot window (per completed envelope)

After the envelope satisfies **on-chain routing** on `FSEnvelopeRegistry` (`quorumMet` when `quorumN > 0`, else `allRequiredSigned`), paid workspaces get a `foc_objects` stub with `replicate_status = pending`. Ciphertext stays on **R2 only** until `r2_evict_after` (`completed_at` + **`R2_HOT_DAYS`**, default **30**).

At `r2_evict_after`, the **`foc-transition`** job uploads to Filecoin, verifies bytes against R2, deletes R2, and sets `replicate_status = replicated`. There is **no overlap** where both backends serve the same blob.

Env: `R2_HOT_DAYS=30`

### Workspace retention (default)

- **Active paid subscription:** retain through current billing `periodEnd` (or platform fallback horizon).
- **Canceled / lapsed:** `periodEnd` + **`WORKSPACE_CHURN_GRACE_DAYS`** (default **90**) before deletion policy applies.
- Env: `WORKSPACE_CHURN_GRACE_DAYS=90`

Distinct from `R2_HOT_DAYS`: churn grace is org-level after subscription ends; hot window is per envelope after completion.

### Archival retention (optional add-on)

- Separate Dodo subscription or bundle; `organization_archival.retention_until`.
- **Still paid while archival sub is active**, even if workspace SaaS is canceled.
- Cancel / failed archival payment → **`ARCHIVAL_EXPORT_GRACE_DAYS`** (default **30**) export window, then purge path.

Effective FOC horizon per object: **`max(workspace, archival)`** — see [`retention-policy.ts`](../lib/domains/foc/retention-policy.ts).

## `foc_objects` table

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `organizationId` | uuid FK | Org that owns retention |
| `pieceCid` | text FK → files | Source envelope |
| `r2Key` | text | e.g. `uploads/{pieceCid}` |
| `byteLength` | int | Set at stub; updated on transition |
| `replicateStatus` | enum | `pending` → `replicated` |
| `dealId` | text | Set after successful FOC upload |
| `retentionUntil` | timestamptz | Effective horizon (workspace ∪ archival) |
| `completedAt` | timestamptz | When envelope routing completed on-chain |
| `r2EvictAfter` | timestamptz | When transition job may run |
| `r2EvictedAt` | timestamptz | When R2 object was deleted |
| `focVerifiedAt` | timestamptz | After FOC bytes verified vs R2 |
| `lifecycle` | enum | `active`, `pending_deletion`, `deleted` |

Stub rows are created when a **paid workspace** envelope is **routing-complete on-chain** (see [`isEnvelopeRoutingCompleteOnChain`](../lib/domains/files/utils/piece-helpers.ts)). Archival purchase **extends** retention on existing rows (and funds Synapse); it does not gate the stub.

## Synapse SDK (`@filoz/synapse-sdk` ^0.41)

- Client: [`lib/platform/foc/synapse.ts`](../lib/platform/foc/synapse.ts)
- Transition: `prepare({ dataSize, extraRunwayEpochs })` → `upload()` → CDN verify → R2 delete
- Extend: archival webhook → `prepare({ dataSize: 0n, extraRunwayEpochs })` — no re-upload

## Jobs

### `foc-transition` (BullMQ + cron)

- **Stub / transition:** [`lib/domains/foc/lifecycle.ts`](../lib/domains/foc/lifecycle.ts) — stub on routing-complete sign; cron enqueues due transitions.

### `foc-extend-retention`

- **Trigger:** Dodo webhook for **archival** SKUs only.
- **Action:** Synapse fund/extend + update `foc_objects.retention_until` to effective max horizon.

## Env

- `R2_HOT_DAYS` (default `30`) — per-envelope R2 hot window before FOC transition
- `WORKSPACE_CHURN_GRACE_DAYS` (default `90`)
- `ARCHIVAL_EXPORT_GRACE_DAYS` (default `30`)
- `FC_SERVER_*` — Synapse payer; fund with **USDFC** + **FIL**

## Implementation status

- Completed-envelope stub + delayed transition + Synapse upload/extend: **implemented**
- CiphertextLocator, FIL balance alerts, attachment replication: **not yet** (parent FOC plan)
