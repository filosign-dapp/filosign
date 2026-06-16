# Filosign Data Lifecycle

This is the engineer-facing deletion and retention policy for server/domain work.

## Core rules

- Do not implement global soft-delete behavior (`deleted_at IS NULL`) across the app.
- Keep signed envelope records immutable (`files`, signatures, settlements, compliance logs).
- Use explicit lifecycle strategy per domain:
  - immutable,
  - status tombstone,
  - expire then purge,
  - hard-delete plus audit trail,
  - GDPR anonymization (not row deletion).

## Required behavior by domain

- **Signed files/signatures**: never hard-delete in product APIs.
- **File acknowledgements** (`file_acknowledgements`): immutable legal record; keep rows, allow only metadata redaction windows for request context fields.
- **Drafts**: archive first, then worker purges archived drafts older than retention.
- **Org members**: use `status = "removed"`, keep historical rows.
- **Invites**: expire by status; optional delayed purge for stale expired invites.
- **Compliance exports**: preserve legal evidence while redacting old request metadata. Export allowed when envelope is fully executed or voided (`completedAt` or `revokedBeforeCompletedAt`). On-chain `documentSha256` is the Merkle root of per-document file hashes.
- **FOC / hot R2**: prefer sender compliance export before `r2EvictAfter`; replication may proceed after the hot window even if the sender never exported.
- **Users**: erase account by anonymizing PII and revoking sessions; do not delete user rows with legal references.

## Schema guardrails (enforced)

- `files.organizationId` uses `onDelete: "restrict"` in schema + `0000_initial.sql` — org delete must use domain deactivation/archive flows, not cascade.
- `user_signatures.walletAddress` has FK to `users.walletAddress` with `onDelete: "restrict"`.
- First production migrate on a **legacy** DB: run preflight checks in [`production-smoke-tests.md`](production-smoke-tests.md) (orphan signatures, FK rollout).

## Guardrails for PRs

For any new list/get endpoint that reads lifecycle-managed tables:

1. Apply explicit status/revocation/expiry filtering:
   - status enums (`active`, `pending`, etc.),
   - `revokedAt IS NULL`,
   - `expiresAt > now()` where appropriate.
2. Avoid relying on cascades for product behavior. Use domain services.
3. Never add API handlers that call `DELETE` on signed `files`.
4. Never add org deletion behavior that can cascade-delete legal records.

### PR checklist

Use when touching `apps/server` handlers, domains, or schema:

- [ ] List/get queries include explicit lifecycle filters (`status`, `revokedAt`, `expiresAt`).
- [ ] No endpoint introduces hard delete for signed `files` data.
- [ ] Org-level destructive operations are guarded against legal-record cascades.
- [ ] New cleanup jobs are idempotent and safe to rerun.
- [ ] If delete-like behavior is needed, corresponding `audit_events` write is included.
- [ ] Storage cleanup is paired with DB cleanup where relevant (draft/template/avatar objects).

## Retention defaults

- Archived drafts: purge after 30 days.
- Expired unclaimed invites: purge after 90 days.
- Compliance request metadata (`requestIp`, `requestUserAgent`): redact after 365 days.

Adjust retention windows only with product/legal approval.
