# GDPR Control Matrix (Engineering Evidence)

Last updated: 2026-06-02

| Control Area | Status | Evidence |
|---|---|---|
| Erasure path for auxiliary PII (`user_history`, platform access) | implemented | `apps/server/api/handlers/users/profile.ts` (`userEraseAccount`) |
| Immutable legal evidence protection | implemented | `project/product/ops/data-lifecycle.md`, `apps/server/lib/platform/db/schema/file.ts` |
| Template object cleanup | implemented | `apps/server/api/handlers/orgs/connections-templates.ts` |
| Archived draft purge | implemented | `apps/server/lib/platform/cron/purge-archived-drafts.ts` |
| Expired invite purge | implemented | `apps/server/lib/platform/cron/purge-expired-invites.ts` |
| Sent draft encrypted blob lifecycle (active+90 policy) | implemented | `apps/server/lib/platform/cron/purge-sent-draft-blobs.ts` |
| Compliance metadata redaction | implemented | `apps/server/lib/platform/cron/redact-compliance-metadata.ts` |
| Access request PII redaction (180-day) | implemented | `apps/server/lib/platform/cron/redact-access-request-pii.ts` |
| Draft plaintext snapshot runtime/output reliance removed | implemented | `apps/server/lib/platform/db/schema/drafts.ts`, `apps/server/api/orpc/schemas/drafts-output.ts`, squashed in `apps/server/drizzle/0000_initial.sql` |
| FK safety: org->files restrict, `user_signatures` FK | implemented (staging/prod rollout required) | `apps/server/lib/platform/db/schema/file.ts`, `apps/server/lib/platform/db/schema/user.ts`, `apps/server/drizzle/0000_initial.sql`, rollout in `project/product/ops/production-smoke-tests.md` |
| DSAR endpoints + request lifecycle + erasure ledger | implemented | `apps/server/api/orpc/router.ts`, `apps/server/api/handlers/users/profile.ts`, `apps/server/api/orpc/schemas/users-output.ts`, `apps/server/lib/platform/db/schema/privacy.ts`, `apps/server/drizzle/0000_initial.sql` |
| Server-side analytics consent receipts | implemented | `apps/server/lib/platform/db/schema/privacy.ts`, `apps/server/api/handlers/users/profile.ts`, `apps/server/api/orpc/router.ts` |
| PII-minimized delivery logs | implemented | `apps/server/lib/platform/email/email.ts` |
| Analytics scrubber hardening | implemented | `packages/shared/utils/compliance.ts`, `packages/shared/tests/analytics-scrub.test.ts` |
| ROPA / DPIA / retention / transfer / breach docs | implemented (engineering baseline) | `project/product/ops/privacy/ropa.md`, `project/product/ops/privacy/dpia.md`, `project/product/ops/privacy/retention-matrix.md`, `project/product/ops/privacy/transfer-register.md`, `project/product/ops/privacy/breach-runbook.md` |
| Public DPA linkage | implemented | `apps/astro/src/pages/legal/data-processing-addendum.astro`, `apps/astro/src/pages/privacy.astro` |

## Residual Risks / Follow-up

- Legal team must replace `TBD` transfer evidence placeholders with signed artifact IDs.
- Production rollout of squashed schema `0000_initial.sql` with staging preflight checks (see `project/product/ops/postgres-ops.md`).
- Backup restoration suppression procedure should be validated in an ops drill.
