# Retention Matrix

Owner: Platform / Privacy  
Last updated: 2026-06-02

**Engineering delete/retention behavior:** [`../data-lifecycle.md`](../data-lifecycle.md).

## Principles

- Preserve signed legal evidence and required billing/security records.
- Minimize and purge operational/volatile data on fixed schedules.
- On erasure requests, anonymize/de-identify where legal retention overrides deletion.

## Table/Object Classes

| Class | Example tables/objects | Retention | Deletion mode | Notes |
|---|---|---|---|---|
| Signed legal evidence | `files`, `file_signatures`, `file_signer_amendments`, `file_acknowledgements`, `compliance_export_logs` | legal/claims retention | immutable core; selective metadata redaction windows where lawful | never add product API hard delete |
| Customer export duty | `compliance_export_logs`, completion packet (ZIP) | operational + legal | sender export preferred before FOC during hot window | On-chain `documentSha256` = Merkle root of SHA-256(raw bytes) per signable document (leaves sorted by doc id); ZIP includes per-doc Merkle proofs |
| Encrypted ciphertext | R2 `uploads/{pieceCid}`, then FOC after replicate+verify | tiered (`r2EvictAfter`, org retention) | delete R2 only after FOC verify | FOC deferred until sender export while `now <= r2EvictAfter`; may proceed after hot window without export |
| Draft artifacts | `envelope_drafts` (`archived`), `envelope_draft_documents`, draft snapshot/doc objects | 30 days after archive | hard delete (scheduled job) | preserve sent-envelope evidence separately |
| Invite lifecycle | `file_cold_invites`, `organization_invites` | expire by status; purge expired unclaimed after 90 days | hard delete for eligible rows | claimed/legal-linked records handled per legal basis |
| Platform access queue | `access_requests`, `checkout_intents`, `platform_access_pending` | operational retention + periodic cleanup | redact or delete based on workflow/state | DSAR redaction path required |
| Billing webhook/event logs | `billing_webhook_events` | billing/legal retention | no early hard delete by default | payload minimization roadmap |
| Session cache | `fs:session:*` | minutes | automatic TTL expiry | immediate revoke on erase |
| Analytics | PostHog events | per analytics policy + consent state | provider retention controls | scrub sensitive fields before send |
| Email operational logs | provider delivery ids + minimal recipient metadata | short operational retention | minimize and rotate | avoid raw recipient addresses in general logs |

## Backup Handling

- Backups are not an immediate erase surface.
- If erased data is restored during disaster recovery, re-run erasure/anonymization workflows before system resumes normal operations.
- Backup retention windows and restoration suppression controls must be documented in ops runbooks.
