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

## Schema guardrails (pending migration)

- `files.organizationId` currently uses `onDelete: "cascade"`. Recommendation: migrate to `onDelete: "restrict"` (or `set null` only if legally approved) and enforce organization deactivation/archive flow in domain code before any delete path.
- `user_signatures.walletAddress` currently has no FK to `users.walletAddress`. Recommendation: add FK with `onDelete: "restrict"` so legal signature records cannot be orphaned or silently detached from identity references.
- Keep these as explicit migrations (with backfill/check queries and deploy plan) rather than ad-hoc handler changes.

## Guardrails for PRs

For any new list/get endpoint that reads lifecycle-managed tables:

1. Apply explicit status/revocation/expiry filtering:
   - status enums (`active`, `pending`, etc.),
   - `revokedAt IS NULL`,
   - `expiresAt > now()` where appropriate.
2. Avoid relying on cascades for product behavior. Use domain services.
3. Never add API handlers that call `DELETE` on signed `files`.
4. Never add org deletion behavior that can cascade-delete legal records.

## Retention defaults

- Archived drafts: purge after 30 days.
- Expired unclaimed invites: purge after 90 days.
- Compliance request metadata (`requestIp`, `requestUserAgent`): redact after 365 days.

Adjust retention windows only with product/legal approval.
