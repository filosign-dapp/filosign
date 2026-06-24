# FOC storage lifecycle (parent dependency)

Org-wide archival billing ([archival pricing catalog](../../.cursor/plans/archival_pricing_catalog_16ebb344.plan.md)) is a **separate** product from workspace SaaS. See also [FOC parallel backup plan](../../.cursor/plans/foc_parallel_backup_125e4207.plan.md).

## Two products (do not conflate)

| Product | What it does |
|---------|----------------|
| **Workspace** (Free / Solo / Teams) | **FOC cold backup** after envelope **routing completes on-chain** when `FOC_BACKUP_ENABLED=true` |
| **Archival SKU** (Dodo, org-wide) | **Extends** Filecoin payment runway on **replicated** `foc_objects` - never the trigger for first upload |

### R2 primary + FOC parallel backup

After the envelope satisfies **on-chain routing** on `FSEnvelopeRegistry` (`quorumMet` when `quorumN > 0`, else `allRequiredSigned`), all workspaces get a `foc_objects` stub with `replicate_status = pending` and **`foc-transition`** is enqueued immediately.

The job uploads to Filecoin via Synapse (FilBeam CDN), verifies bytes against R2 over CDN, and sets `replicate_status = replicated`. **`dealId` is checkpointed after upload** so BullMQ retries skip re-upload and only resume verify. **R2 is not deleted** - both backends may hold the same ciphertext.

App downloads always use **R2 presign**; FOC is cold backup only.

### Workspace retention (default)

- **Active paid subscription:** retain through current billing `periodEnd` (or platform fallback horizon).
- **Free / canceled / lapsed:** fallback horizon per [`retention-policy.ts`](../lib/domains/foc/retention-policy.ts) (Free: +1 year default when no SaaS/archival window).
- **Canceled paid:** `periodEnd` + **`WORKSPACE_CHURN_GRACE_DAYS`** (default **90**).

Env: `WORKSPACE_CHURN_GRACE_DAYS=90`

### Archival retention (optional add-on)

- Separate Dodo subscription or bundle; `organization_archival.retention_until`.
- **Still paid while archival sub is active**, even if workspace SaaS is canceled.
- Cancel / failed archival payment → **`ARCHIVAL_EXPORT_GRACE_DAYS`** (default **30**) export window, then purge path.

Effective FOC horizon per object: **`max(workspace, archival)`** - see [`retention-policy.ts`](../lib/domains/foc/retention-policy.ts).

## `foc_objects` table

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `organizationId` | uuid FK | Org that owns retention |
| `pieceCid` | text FK → files | Source envelope |
| `r2Key` | text | e.g. `uploads/{pieceCid}` |
| `byteLength` | int | Set at stub; updated on transition |
| `replicateStatus` | enum | `pending` → `replicated` |
| `dealId` | text | Set after Synapse upload commits (checkpoint before verify) |
| `retentionUntil` | timestamptz | Effective horizon (workspace ∪ archival) |
| `completedAt` | timestamptz | When envelope routing completed on-chain |
| `r2EvictedAt` | timestamptz | Null unless R2 was explicitly evicted (future cutover) |
| `focVerifiedAt` | timestamptz | After FOC bytes verified vs R2 |
| `lifecycle` | enum | `active`, `pending_deletion`, `deleted` |

Stub rows are created when any workspace envelope is **routing-complete on-chain** (see [`isEnvelopeRoutingCompleteOnChain`](../lib/domains/files/utils/piece-helpers.ts)). Archival purchase **extends** retention on existing rows (and funds Synapse); it does not gate the stub.

## Synapse SDK (`@filoz/synapse-sdk` ^0.41)

- Client: [`lib/platform/foc/synapse.ts`](../lib/platform/foc/synapse.ts)
- Transition: `prepare({ dataSize, extraRunwayEpochs })` → `upload()` → checkpoint `deal_id` → verify (R2 retained)
- Extend: archival webhook → `prepare({ dataSize: 0n, extraRunwayEpochs })` - no re-upload

## Downloads

[`resolveCiphertextDownloadUrl`](../lib/domains/foc/ciphertext-locator.ts): **R2 presign** by default. When `FOC_RETRIEVAL=true` and the `foc_objects` row is `replicated` with `focVerifiedAt` set, returns the **FilBeam CDN URL** (requires `FOC_BACKUP_ENABLED=true`). Wired into `pieceDownloadUrl` and cold-invite flows.

## Jobs

### `foc-transition` (BullMQ + cron)

- **Stub / transition:** [`lib/domains/foc/lifecycle.ts`](../lib/domains/foc/lifecycle.ts) - stub on routing-complete sign; cron enqueues pending transitions (`15 */6 * * *` UTC).

### `foc-extend-retention`

- **Trigger:** Dodo webhook for **archival** SKUs only.
- **Action:** Synapse fund/extend + update `foc_objects.retention_until` to effective max horizon.

## Env

| Variable | Default | Purpose |
|----------|---------|---------|
| `FOC_BACKUP_ENABLED` | `false` | Master switch: stubs, worker, cron, archival Synapse extend |
| `FOC_RETRIEVAL` | `false` | Download from FilBeam for replicated objects (requires backup) |
| `FOC_WALLET_*` | optional | Required when `FOC_BACKUP_ENABLED=true`; Synapse payer (USDFC + FIL) |
| `FC_SYNAPSE_DATASET_ID` | optional | Pin platform dataset; set from first create log or `deal_id` |
| `WORKSPACE_CHURN_GRACE_DAYS` | `90` | Post-cancel workspace retention |
| `ARCHIVAL_EXPORT_GRACE_DAYS` | `30` | Post-archival-lapse export window |

When `FOC_BACKUP_ENABLED=false`, `FOC_WALLET_*` may be omitted (local/staging). Bootstrap skips FOC wallet validation; FOC worker and wallet balance cron do not run.

## Mainnet rollout

1. Deploy code; set `FOC_BACKUP_ENABLED=true`, `CHAIN=mainnet` in Infisical `prod`; redeploy **API + worker**.
2. Confirm `FOC_WALLET` funded (USDFC + FIL on mainnet).
3. Complete one test envelope (Free or paid org).
4. Worker log: `foc-transition: replicated (R2 retained)` with `dealId`.
5. DB: `replicate_status = replicated`, `foc_verified_at` set, `r2_evicted_at` **NULL**.
6. App download still uses R2.

## Implementation status

- Routing-complete stub + immediate transition + Synapse upload/extend: **implemented**
- Parallel backup (R2 retained) + R2-only ciphertext locator: **implemented**
- FIL/USDFC wallet balance alerts when backup enabled (twice-daily cron UTC 08:00 and 20:00; staging/production): **implemented**
- Attachment replication: **not yet** (parent FOC plan)
