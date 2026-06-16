# Record of Processing Activities (ROPA)

Owner: Platform / Privacy  
Last updated: 2026-06-02

## 1. Controller and Processor Roles

- Controller functions: account/profile, authentication/session, workspace administration, billing state, abuse/security, support, product analytics (consent-gated).
- Processor-first functions: customer envelope workflows, recipient/signer metadata, encrypted document handling under customer instructions.

## 2. Processing Inventory

| Activity | Data categories | Purpose | Legal basis | Recipients/processors | Retention |
|---|---|---|---|---|---|
| Account/profile | wallet, auth subject, email, names, username, avatar key | user account and identity continuity | contract, legitimate interests | thirdweb auth, hosting/storage | active account; anonymize on erase |
| Session/auth cache | wallet, user id, email (session cache) | authenticated API access and abuse controls | contract, legitimate interests | dragonfly/redis | short TTL (minutes) |
| Draft workflow | recipient metadata, fields, optional messages | draft creation and collaboration | contract | storage, email providers | active drafts; archive/purge job |
| Sent envelopes | encrypted blobs, participant metadata, signatures, audit/proof | execute signing and preserve legal evidence | contract, legal claims/compliance | storage, chain infra | immutable/legal retention |
| Billing/subscriptions | customer/subscription ids, status, webhook payloads | plan provisioning and billing operations | contract, legal obligation | Dodo, email providers | billing/legal retention |
| Support/ops logs | request metadata, error diagnostics | reliability and incident response | legitimate interests | hosting/observability tooling | per retention matrix |
| Analytics | pseudonymous event properties (scrubbed) | product quality and diagnostics | consent (where required) / legitimate interests | PostHog EU | consent-aware retention |

## 3. Data Subject Categories

- Registered users (workspace owners, admins, senders, signers, viewers).
- Recipients/signers invited by customers.
- Prospective users (access requests / checkout intents).

## 4. Transfers and Safeguards

- EU-first hosting where configured.
- Non-EU transfer exceptions documented in `transfer-register.md`.
- Contractual safeguards and vendor controls tracked in transfer register.

## 5. Security Measures

- Private object storage and short-lived presigned URLs.
- Session TTL and token verification.
- Access controls by workspace membership/role.
- Audit/proof logs for legal workflow integrity.
- Data minimization and scheduled redaction/purge jobs.
