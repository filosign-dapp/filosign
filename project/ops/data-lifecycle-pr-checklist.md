# Data Lifecycle PR Checklist

Use this checklist when touching `apps/server` handlers, domains, or schema.

- [ ] List/get queries include explicit lifecycle filters (`status`, `revokedAt`, `expiresAt`).
- [ ] No endpoint introduces hard delete for signed `files` data.
- [ ] Org-level destructive operations are guarded against legal-record cascades.
- [ ] New cleanup jobs are idempotent and safe to rerun.
- [ ] If delete-like behavior is needed, corresponding `audit_events` write is included.
- [ ] Storage cleanup is paired with DB cleanup where relevant (draft/template/avatar objects).
