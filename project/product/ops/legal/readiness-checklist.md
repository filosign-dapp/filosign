# Filosign Legal Readiness Checklist

Source of truth for launch assumptions. This is not legal advice.

## Current launch posture

- Filosign is the service brand; no separate entity is formed yet.
- Dodo Payments is planned as merchant of record/payment processor for subscriptions.
- Production settlement target: USDC on Base.
- Sandbox/test environment target: Base Sepolia.
- Payout attachment access is manually approved per workspace (`organization_settlement_feature_access`) after Settlement Feature Addendum acceptance at request time.
- Filosign charges SaaS subscription fees only, not settlement-volume fees.
- Filosign does not custody, hold, pool, convert, or transmit user funds.
- Documents are encrypted client-side before upload; Filosign should not see plaintext contents.
- Metadata, participant data, wallet addresses, transaction hashes, billing data, logs, and support data are processed by the service.
- No AI processing or AI training on user documents.
- No formal legal review, smart contract audit, SOC 2, ISO 27001, or SLA yet.

## Before paid production launch

- **Counsel briefing packet:** [counsel-brief.md](counsel-brief.md) (attach current Terms, Privacy, subprocessors).
- Confirm public operator/entity details for Terms and Privacy (currently individual operator, Jaunpur, India).
- Subprocessors page aligned to production stack: Hetzner (app + Postgres), Cloudflare R2, Resend, thirdweb, PostHog, Dodo MoR.
- Route **privacy@filosign.xyz** to the grievance inbox (listed in Privacy Policy).
- Confirm Dodo live checkout, refund flow, portal links, and receipt copy.
- Add explicit e-sign consent in the signing flow.
- Add PostHog consent controls for non-essential analytics.
- Configure backups for database and Cloudflare R2.
- Route aliases: support@, security@, privacy@, contact@, sales@ to the founder inbox.
- Confirm document retention windows by plan and post-cancellation export grace period.
- Decide whether to publish an unaudited-contract notice publicly or only in contextual settlement/security pages.
- Get counsel review for ToS, Privacy, Acceptable Use, e-signature language, refunds, sanctions, payout attachment posture, and [Settlement Feature Addendum](/legal/settlement-feature-addendum).
- Publish payout attachment legal pages: Terms §9, [non-custodial payout](/legal/non-custodial-settlement), [addendum](/legal/settlement-feature-addendum).
- Ops runbook: [`../../../settlements/settlements/payout-feature-approval-checklist.md`](../../../settlements/settlements/payout-feature-approval-checklist.md).

## Operational defaults

- Refunds: default no refunds, with 7-day goodwill review for legitimate mistakes.
- Chargebacks: suspend paid features and settlement access during review; preserve reasonable export access unless fraud/security/legal risk exists.
- Deletion: delete encrypted files and metadata where feasible; on-chain records, billing records, security logs, backups, and legal records may remain.
- E-signature claims: evidence-supporting workflows only; users decide jurisdiction and document suitability.
- High-risk documents: exclude workflows needing notarization, wet ink, QES, court/government filing, or special statutory formalities unless the user verifies suitability.
