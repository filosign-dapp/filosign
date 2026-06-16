# GDPR Audit Status Matrix (archived)

**Superseded:** June 2026. Use [`../gdpr-control-matrix.md`](../gdpr-control-matrix.md) as the living evidence index. This file is a pre-remediation audit snapshot retained for history only.

---

# GDPR Audit Status Matrix

This matrix maps the external GDPR audit findings to current implementation status and evidence.

## Status Legend

- `mitigated`: implemented in code/docs and active.
- `partial`: some controls exist, but not complete end-to-end.
- `active`: identified gap remains.

## Findings Matrix

| Finding | Status | Evidence | Notes |
|---|---|---|---|
| Account erasure leaks in `user_history` / platform access tables | mitigated | `apps/server/api/handlers/users/profile.ts` | `userEraseAccount` deletes `user_history`, deletes/redacts `platform_invite_redemptions`, and redacts matching `access_requests`. |
| Template storage object not deleted on template delete | mitigated | `apps/server/api/handlers/orgs/connections-templates.ts` | Best-effort `bucket.delete` added with warning-only fallback. |
| `file_acknowledgements` not explicitly classified as immutable legal record | mitigated | `project/product/ops/data-lifecycle.md` | Explicitly listed as immutable legal record. |
| Archived draft purge missing | mitigated | `apps/server/lib/platform/cron/purge-archived-drafts.ts` | Worker cron purges old archived drafts and related objects. |
| Expired invite purge missing | mitigated | `apps/server/lib/platform/cron/purge-expired-invites.ts` | Worker cron purges stale expired unclaimed invites. |
| Compliance metadata retention/redaction missing | mitigated | `apps/server/lib/platform/cron/redact-compliance-metadata.ts` | Redacts stale `requestIp`/`requestUserAgent`. |
| Draft plaintext snapshot persisted in Postgres | active | `apps/server/lib/platform/db/schema/drafts.ts`, `apps/server/lib/domains/drafts/drafts-lifecycle.ts` | Must remove plaintext persistence path and retain digest-only metadata. |
| `files.organizationId` still cascade-deletes | active | `apps/server/lib/platform/db/schema/file.ts` | Needs migration to `restrict` and org-delete guardrail enforcement. |
| `user_signatures.walletAddress` missing FK | active | `apps/server/lib/platform/db/schema/user.ts` | Needs FK migration with preflight orphan check. |
| Public/customer DPA page | active | `apps/astro/src/pages/privacy.astro` | Privacy page exists; customer DPA page + linkage required. |
| Internal ROPA / DPIA / transfer register / breach runbook | active | `project/privacy/` | Must be created and maintained. |
| DSAR workflows beyond erase (export/status/restriction handling) | partial | `apps/server/api/handlers/users/profile.ts`, `apps/server/api/orpc/router.ts` | Erase exists; export/status and retained-record response matrix required. |
| Logging minimization for recipient emails | active | `apps/server/lib/platform/email/deliver.ts` | Current logs still include raw `to` values. |
| Analytics consent receipts server-side | active | client consent only in app | Consent gating exists client-side; server evidence records still required. |
| Breach register and 72-hour operational runbook | active | no dedicated runbook in repo | Add documented incident process and templates. |
| Transfer safeguards evidence (SCC/IDTA/TIA) | active | no transfer register currently | Add vendor-level transfer register + legal artifacts index. |
