# DPIA (Data Protection Impact Assessment) - Engineering Baseline

Owner: Platform / Privacy  
Last updated: 2026-06-02

## Scope

Filosign signing workflows, identity/session handling, analytics, billing/access workflows, and legal evidence retention.

## Processing Likely to Raise Risk

- Recipient and signer identity/workflow metadata at scale.
- Public-chain transaction metadata linked to signing events.
- Vendor ecosystem including global processors.
- Legal evidence retention that can conflict with erasure expectations.

## Risk Areas and Controls

| Risk | Impact | Current control | Residual risk | Action |
|---|---|---|---|---|
| Unauthorized access to workflow metadata | confidentiality | private storage, role-based access, auth checks | medium | continue least-privilege and access audits |
| Draft plaintext persistence | confidentiality | draft purge + retention controls | medium-high | remove plaintext DB snapshot path, keep digest-only metadata |
| Erasure incompleteness across auxiliary tables | rights compliance | `userEraseAccount` coverage expanded | medium | DSAR export/status and retained-exception matrix |
| International transfer ambiguity | transfer compliance | EU-first infrastructure posture | medium | maintain transfer register + safeguard evidence |
| Breach response timing failure | regulator risk | platform alerts and logs | medium | formalize 72-hour incident runbook |
| Over-collection in logs/analytics | minimization | scrubber + consent gating | medium | tighten email logging and scrubber patterns |

## Necessity and Proportionality

- Service requires identity, workflow metadata, and signed evidence for e-signature validity and dispute defense.
- Encryption and minimization reduce exposure of document content.
- Retention and erasure controls are constrained by legal-claims and compliance obligations.

## Decision

- Proceed with remediation roadmap.
- Reassess after draft-plaintext removal, DSAR tooling, and transfer documentation completion.
