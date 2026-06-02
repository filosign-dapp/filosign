# Vendor Transfer Register

Owner: Platform / Privacy  
Last updated: 2026-06-02

## Purpose

Track processor/subprocessor locations, transfer safeguards, and evidence links for EU/UK data-transfer accountability.

## Register

| Vendor | Function | Data classes | Region posture | Vendor owner | DPA link | SCC/IDTA artifact ID | Signed date | Next review date | Legal contact | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Hetzner | app/db/cache hosting | account/workflow metadata, encrypted blobs, logs | EU-first | Platform | `TBD` | `N/A (EEA-only)` | `TBD` | 2026-12-01 | `TBD` | blocked-artifact-missing | primary runtime infra |
| Cloudflare R2 | object storage | encrypted files, snapshots, exports | EU-configured where possible | Platform | `TBD` | `SCC-TBD` | `TBD` | 2026-12-01 | `TBD` | blocked-artifact-missing | verify bucket config per env |
| PostHog (EU) | analytics/issues | pseudonymous event metadata | EU project | Product Analytics | `TBD` | `DPA-EU-TBD` | `TBD` | 2026-12-01 | `TBD` | blocked-artifact-missing | consent-gated |
| Resend / SES | transactional email | recipient email, template metadata | EU preference where available | Platform | `TBD` | `SCC-TBD` | `TBD` | 2026-12-01 | `TBD` | blocked-artifact-missing | reduce recipient logging |
| thirdweb | wallet/session auth | wallet identity/auth metadata | region not user-selectable | Platform | `TBD` | `SCC/IDTA-TBD` | `TBD` | 2026-12-01 | `TBD` | blocked-artifact-missing | document transfer exception in DPIA |
| Dodo | billing and subscriptions | customer/subscription identifiers | global service | Finance Ops | `TBD` | `SCC/IDTA-TBD` | `TBD` | 2026-12-01 | `TBD` | blocked-artifact-missing | legal seller/MoR role |

## Required Evidence Artifacts

- DPA or processing terms permalink (`DPA link`).
- SCC/IDTA identifier in legal evidence store (`SCC/IDTA artifact ID`).
- Signed date and next legal re-review date.
- Named owner and legal contact for operational follow-up.

## Transfer Impact Notes

- EU-first posture reduces transfer surface but does not remove transfer obligations.
- Non-EU operator access, vendor support access, and globally distributed services must remain documented with safeguards.
