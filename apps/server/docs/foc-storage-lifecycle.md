# FOC storage lifecycle (parent dependency)

Org-wide archival billing ([archival pricing catalog](../../.cursor/plans/archival_pricing_catalog_16ebb344.plan.md)) is a **separate** product from workspace SaaS. See also [FOC parallel backup plan](../../.cursor/plans/foc_parallel_backup_125e4207.plan.md).

## Two products (do not conflate)

| Product | What it does |
|---------|----------------|
| **Paid workspace** (Solo / Teams) | **FOC platform backup** after envelope **completion** (all signers signed) — independent of archival SKU |
| **Archival SKU** (Dodo, org-wide) | **Extends** Filecoin payment runway on **replicated** `foc_objects` — never the trigger for first upload |

**Free** workspace: R2 only; no `foc_objects` stub.

### R2 primary + FOC parallel backup

After the envelope satisfies **on-chain routing** on `FSEnvelopeRegistry` (`quorumMet` when `quorumN > 0`, else `allRequiredSigned`), paid workspaces get a `foc_objects` stub with `replicate_status = pending`. Ciphertext stays on **R2** (primary; free egress) until the FOC replicate job runs.

The replicate job becomes eligible at `r2_evict_after` (`completed_at` + **`R2_HOT_DAYS`**, default **30**), or earlier if the sender exports a compliance packet during the hot window.

At eligibility, the **`foc-transition`** job uploads to Filecoin, verifies bytes against R2 via CDN, and sets `replicate_status = replicated`. **R2 is not deleted** — both backends may hold the same ciphertext. App downloads prefer R2 presign; FOC CDN is fallback when R2 is missing (future cutover).

Env: `R2_HOT_DAYS=30`

### `TEST_FOC` (prod smoke only)

Set `TEST_FOC=true` in Infisical `prod` for a short smoke test:

- Immediate FOC replicate on envelope completion (no 30-day wait, no export deferral)
- Download resolver prefers FOC CDN when replicated (proves retrieval without deleting R2)
- **Remove after test** — triggers real Synapse spend per completed paid envelope

### Workspace retention (default)

- **Active paid subscription:** retain through current billing `periodEnd` (or platform fallback horizon).
- **Canceled / lapsed:** `periodEnd` + **`WORKSPACE_CHURN_GRACE_DAYS`** (default **90**) before deletion policy applies.
- Env: `WORKSPACE_CHURN_GRACE_DAYS=90`

Distinct from `R2_HOT_DAYS`: churn grace is org-level after subscription ends; hot window is per envelope before FOC replicate.

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
| `r2EvictAfter` | timestamptz | When replicate job may run (legacy column name) |
| `r2EvictedAt` | timestamptz | Null unless R2 was explicitly evicted (future cutover) |
| `focVerifiedAt` | timestamptz | After FOC bytes verified vs R2 |
| `lifecycle` | enum | `active`, `pending_deletion`, `deleted` |

Stub rows are created when a **paid workspace** envelope is **routing-complete on-chain** (see [`isEnvelopeRoutingCompleteOnChain`](../lib/domains/files/utils/piece-helpers.ts)). Archival purchase **extends** retention on existing rows (and funds Synapse); it does not gate the stub.

## Synapse SDK (`@filoz/synapse-sdk` ^0.41)

- Client: [`lib/platform/foc/synapse.ts`](../lib/platform/foc/synapse.ts)
- Transition: `prepare({ dataSize, extraRunwayEpochs })` → `upload()` → CDN verify (R2 retained)
- Extend: archival webhook → `prepare({ dataSize: 0n, extraRunwayEpochs })` — no re-upload

## Downloads

[`resolveCiphertextDownloadUrl`](../lib/domains/foc/ciphertext-locator.ts): R2 presign first; FOC CDN when R2 missing (or prefer FOC when `TEST_FOC=true` and replicated). Wired into `pieceDownloadUrl` and cold-invite flows.

## Jobs

### `foc-transition` (BullMQ + cron)

- **Stub / transition:** [`lib/domains/foc/lifecycle.ts`](../lib/domains/foc/lifecycle.ts) — stub on routing-complete sign; cron enqueues due transitions (`15 */6 * * *` UTC).

### `foc-extend-retention`

- **Trigger:** Dodo webhook for **archival** SKUs only.
- **Action:** Synapse fund/extend + update `foc_objects.retention_until` to effective max horizon.

## Env

- `R2_HOT_DAYS` (default `30`) — delay before FOC replicate job may run
- `TEST_FOC` (default `false`) — prod smoke: immediate replicate + FOC download verify
- `WORKSPACE_CHURN_GRACE_DAYS` (default `90`)
- `ARCHIVAL_EXPORT_GRACE_DAYS` (default `30`)
- `FC_SERVER_*` — Synapse payer; fund with **USDFC** + **FIL**

## Prod smoke runbook

1. Deploy code; set `TEST_FOC=true` in Infisical `prod`; redeploy **API + worker**.
2. Confirm `FC_SERVER` wallet funded (USDFC + FIL on mainnet).
3. Complete one **paid-org** test envelope.
4. Worker log: `foc-transition: replicated (R2 retained)` with `dealId`.
5. DB: `replicate_status = replicated`, `foc_verified_at` set, `r2_evicted_at` **NULL**.
6. Open document in app (download via FOC while `TEST_FOC=true`); decrypt succeeds.
7. Set `TEST_FOC=false`, redeploy — downloads return to R2-primary.

## Implementation status

- Completed-envelope stub + delayed transition + Synapse upload/extend: **implemented**
- Parallel backup (R2 retained) + ciphertext locator: **implemented**
- FIL balance alerts, attachment replication: **not yet** (parent FOC plan)
