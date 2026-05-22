# Feature effort ranking (suggested roadmap)

Ranked against the current codebase and [entitlement_breakdown_report.md](./entitlement_breakdown_report.md). Marketing tiers in the report map to code plans in [`packages/entitlements/src/catalog/v1.ts`](../../packages/entitlements/src/catalog/v1.ts): `free`, `individual`, `teams`, `enterprise`.

**Effort scale (relative):**

| Label | Rough meaning |
| ----- | ------------- |
| **XS** | Days — wiring, gating, polish |
| **S** | ~1 week |
| **M** | 2–4 weeks |
| **L** | 1–2 months |
| **XL** | Multi-month / platform |

---

## Already largely built (XS)

| Feature | Tier | Why so low | How to build |
| ------- | ---- | ---------- | ------------ |
| **Standard form fields** | Free Trial | **Done:** 7 placement types in [`field-types.ts`](../../apps/client/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-types.ts); manifest + send path exists | Entitlement gates per tier; sign flow still tracks `completedFieldIds` only (not rich field values) |
| **Basic audit trail** | Free Trial | **Done:** compliance PDF v3 in [`compliance-pdf/`](../../apps/client/src/lib/domains/files/compliance-pdf/) | Add signer IP capture on register/sign in server handlers; include in compliance bundle |
| **Mobile-responsive signing UI** | Free Trial | **Partial:** sticky header, responsive sign layout | Polish breakpoints, touch targets, field overlays on small screens |
| **Embedded signing sandbox (testnet)** | Platform Starter | **Partial:** `VITE_CHAIN=testnet`, Base Sepolia | Document sandbox for API consumers; optional testnet-only API base URL / keys |

---

## Small product features (S)

| Feature | Tier | Why | How to build |
| ------- | ---- | --- | ------------ |
| **Manual email reminders** | Free Trial | Resend + templates exist ([`invites.ts`](../../apps/server/lib/platform/email/invites.ts)) | oRPC `files.remindSigners` + dashboard button; dedupe/cooldown |
| **Cryptographically signed webhooks** | Platform Starter | Same pattern as [`gelato-secret.ts`](../../apps/server/api/integrations/gelato-secret.ts) | Per-API-key secret; HMAC on outbound POST body |
| **Custom metadata passthrough** | Platform Starter | No `metadata` on files yet | `jsonb` on `files`; include in register, detail, webhooks |
| **API key management dashboard** | Platform Starter | Auth is JWT wallet today; OpenAPI mount exists | `api_keys` table; middleware; rotation/revoke UI |
| **Shared template folders** | Team Pro | Org templates done ([`connections-templates.ts`](../../apps/server/api/handlers/orgs/connections-templates.ts)) | `folder_id` + permissions; UI tree |
| **Custom metadata tagging & dashboard filters** | Team Pro | File list RPCs exist | `tags` column or junction; filter `list/sent` |
| **Seat quota allocation / redistribution** | Team Pro | Seats + pooled quota partial ([`billing.ts`](../../apps/server/lib/platform/db/schema/billing.ts)) | Admin UI for per-member caps; enforce on send |
| **Advanced audit export (CSV/JSON)** | Team Pro | Compliance bundle done client-side | Reuse decrypt + bundle; CSV/JSON download |
| **Advanced field types** (radio, dropdown, regex) | Secure Solo | Checkbox + text exist | Extend [`placement-manifest`](../../packages/shared/placement-manifest.ts); palette + sign UX |
| **Iframe `postMessage` events** | Platform Pro | No embed route | Embed route + `postMessage` on sign/decline/complete |
| **SDK white-labeled SMTP relay** | Platform Pro | — | Per-dev/org SMTP settings on email transport |
| **Bring your own SMTP** | Enterprise | Resend wired | Per-org SMTP config; template from-domain |

---

## Medium (M)

| Feature | Tier | Why | How to build |
| ------- | ---- | --- | ------------ |
| **Basic webhook integrations** | Team Standard | Only Gelato webhooks today | `webhook_endpoints` per org; emit on sign/register/complete; queue + retries |
| **Automated reminder rules & expiration** | Team Standard | Invite TTL cron partial | Envelope `expires_at` + `reminder_schedule`; cron → email |
| **Sequential signing workflows** | Team Standard | Order passed but not enforced | Server gate: no invite/sign until prior signer done; optional delayed emails |
| **Encrypted shared contacts & team address book** | Team Standard | Connections graph partial | Org-scoped contacts; optional encrypted notes |
| **Local CSV data export** | Secure Solo | No CSV; decrypt path exists | Client: fetch blobs → decrypt → flatten manifest + fields → CSV |
| **Custom branding** | Team Pro | Not in app UI | Org logo/colors; email template vars on sign + emails |
| **Bulk send (client-side loop)** | Team Pro | Single send pipeline done | CSV → loop `useSendFile`; progress UI; rate limits |
| **E2EE collaborative comments** | Team Pro | Catalog flag only | Encrypted comment blob; sidebar; oRPC append/list |
| **Team activity logs** | Enterprise | `auth_audit_events` only | Workspace audit table; emit from handlers |
| **Audit log streaming (SIEM)** | Enterprise | Extension of activity logs | HTTP/syslog sink per org |
| **Document assembly API (anchor text)** | Platform Pro | Manual PDF placement only | PDF text search → coordinates → manifest; API anchor strings |

---

## Large (L)

| Feature | Tier | Why | How to build |
| ------- | ---- | --- | ------------ |
| **Encrypted signer attachments** | Secure Solo | Doc encryption done; no signer upload fields | Attachment field type; encrypt at sign; presigned PUT; sender decrypt |
| **Shared template libraries (team key-sharing)** | Team Standard | Org templates + member keys partial | Per-org team symmetric key; wrap per member; re-encrypt templates |
| **Conditional field logic & calculations** | Team Pro | Static manifest only | Rules in manifest; evaluator on sign; **needs field value capture first** |
| **Server-side WASM SDKs (Node/Go/Python)** | Platform Pro | Internal node WASM only | Public package, semver, docs; Go/Python via FFI or sidecar |

---

## Extra large (XL)

| Feature | Tier | Why | How to build |
| ------- | ---- | --- | ------------ |
| **Custom subdomains** | Team Pro | Single-host app today | Wildcard DNS, TLS, tenant routing, CORS, cookies |
| **Single sign-on (SAML/OIDC)** | Enterprise | Wallet/JWT only | IdP + preserve client key unlock ceremony |
| **Active Directory / LDAP sync** | Enterprise | — | SCIM/LDAP connector; group → seat mapping |
| **Bring your own key (BYOK)** | Enterprise | App-managed KEM only | KMS envelope for org keys; revoke semantics |
| **eWitness & QES compliance** | Enterprise | — | Third-party QES provider; legal/compliance integration |

---

## Summary: easiest → hardest

1. **XS:** Standard fields (gate), basic audit (+ IP), mobile polish, testnet sandbox docs  
2. **S:** Manual reminders, signed webhooks, metadata passthrough, API keys, template folders, tags/filters, seat quota UI, advanced audit export, advanced field types, `postMessage`, custom SMTP  
3. **M:** Product webhooks, auto-reminders/expiration, sequential signing, team contacts, CSV export, branding, bulk send, E2EE comments, activity logs, SIEM streaming, anchor-text assembly  
4. **L:** Signer attachments, team template keys, conditional fields (+ values prerequisite), public server WASM SDKs  
5. **XL:** Custom subdomains, SSO, LDAP, BYOK, QES/eWitness  

---

## Cross-cutting prerequisites

| Prerequisite | Unlocks |
| ------------ | ------- |
| **Field value capture** (beyond `completedFieldIds`) | CSV export, conditional logic, calculations |
| **Product webhook infrastructure** | Signed webhooks, metadata in events, Platform Starter |
| **Per-org settings store** | Branding, SMTP, webhooks, subdomains |
| **Team symmetric key design** | Shared template libraries (beyond current org templates) |
| **Public API auth (API keys)** | Platform tier integrations |

---

## Report vs codebase (gaps)

- **Free Trial “standard fields”** — largely **already built**; tier work is gating + sign UX.  
- **“Shared templates” (Team Standard)** — org templates exist; **team key-sharing** is the **L** row above.  
- **`features.routing.advanced`** is in the catalog but **sequential signing is not implemented**.  
- **Payments / USDC** are implemented (on-chain rules + Gelato) but were outside the suggested-feature list in the report.

---

## Codebase maturity snapshot (by area)

| Area | Maturity | Key paths |
| ---- | -------- | --------- |
| Form fields / placement | **done** (values partial) | `add-sign/`, `placement-manifest.ts` |
| Email / reminders | **partial** | `lib/platform/email/`, `packages/emails/` |
| Audit / compliance PDF | **done** | `compliance-pdf/`, `compliance-bundle.ts` |
| Mobile sign UI | **partial** | `document/sign/-components/` |
| Signer attachments | **none** | — |
| CSV export | **none** | — |
| Templates / org keys | **done–partial** | `orgs/connections-templates.ts`, `invites-keys.ts` |
| Sequential signing | **partial** (order not enforced) | `send-envelope.ts` |
| Product webhooks | **none** (Gelato only) | `integrations/gelato.ts` |
| Contacts | **partial** | `connections/-lib/utils/contacts.ts` |
| Reminders / expiration | **partial** | `expire-invites.ts` |
| Seat / billing | **partial** | `packages/entitlements/`, `billing.ts` |
| Bulk send | **none** | — |
| Comments | **none** (flag only) | `features.comments` |
| Conditional fields | **none** | — |
| Branding / subdomains | **none** / marketing | astro pricing |
| API keys | **none** | oRPC + JWT only |
| SSO / LDAP / BYOK | **none** | — |
| Embed / postMessage | **none** | — |
| Anchor text placement | **none** | manual placement only |
| Server WASM SDK | **partial** (internal) | `crypto-utils/node` |

*Generated from codebase review aligned with entitlement_breakdown_report.md.*
