# Incident And Breach Runbook

Owner: Platform / Security  
Last updated: 2026-06-02

## Trigger Conditions

- Confirmed or suspected unauthorized access/disclosure.
- Integrity compromise of signing/audit evidence.
- Loss of availability with potential data impact.
- Vendor incident affecting Filosign user data.

## Severity Levels

- `sev1`: active breach/high confidence impact on personal data or legal records.
- `sev2`: probable impact, under investigation.
- `sev3`: security incident with no confirmed personal data impact.

## Response Workflow

1. Triage and contain (rotate keys/tokens, isolate impacted systems, disable risky paths).
2. Open incident record with timestamps, systems, data classes, and evidence links.
3. Determine whether personal data was affected, categories, volume, and data-subject scope.
4. Start regulatory timer when breach is likely notifiable (72-hour clock).
5. Notify affected controllers/customers where processor obligations apply.
6. Prepare regulator and user communications where required.
7. Remediate root cause and publish post-incident corrective actions.

## Required Artifacts

- Incident timeline.
- Impact assessment.
- Notification decision and legal rationale.
- Communication templates used.
- Postmortem with preventative controls.

## Processor-to-Controller Path

- Where Filosign processes customer envelope data as processor, notify customer controller without undue delay with:
  - incident summary,
  - affected data categories,
  - containment actions,
  - recommended customer-side next actions.
