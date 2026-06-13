# Payout attachment access - manual approval checklist

Use when reviewing a workspace **Programmatic payout attachment** request (`organization_settlement_feature_access.status = pending`). This is an operational checklist, not legal advice.

## Before you approve

- [ ] **Identity** - Requester is an org **owner** or **admin** with `billing:manage`; workspace name and members match a legitimate account (not a throwaway org).
- [ ] **Use case** - `useCase` field describes a lawful, non–high-risk workflow (no sanctions evasion, gambling, unlicensed MSB, etc.).
- [ ] **Sanctions self-cert** - `sanctionsSelfCertAt` is set (checkbox on request form).
- [ ] **Terms** - `termsVersion` matches current `SETTLEMENT_FEATURE_TERMS_VERSION`; addendum linked in app matches published `/legal/settlement-feature-addendum`.
- [ ] **Plan** - Workspace has settlement entitlements on its plan (basic/advanced as needed).
- [ ] **Treasury (if applicable)** - If they will pay from org treasury, `orgWalletAddress` is linked and matches their stated control model.

## Approve

1. Open **Admin → Payout attachment requests**.
2. Approve with optional **review note** (stored in `reviewNote`, `reviewedByAdminWallet`, `reviewedAt`).
3. Confirm requester can attach payouts on a test envelope (sender wallet or org treasury only).

## Deny / suspend

- Reject with a clear **review note** (user-visible where product surfaces it).
- For abuse or sanctions concern: reject, document internally, and consider broader account action per AUP.

## Audit evidence

| Event | Where |
|-------|--------|
| Sender accepts addendum + use case | `organization_settlement_feature_access` (`acceptedAt`, `acceptedByWallet`, `termsVersion`, `useCase`) |
| Manual approve/deny | Same row (`reviewedAt`, `reviewedByAdminWallet`, `reviewNote`, `status`) |
| Recipient disclosure at sign | `file_settlement_recipient_acks` |
| On-chain payout events | Indexed `file_settlement_rules` + compliance export |

Phase 2 (optional): automated wallet/entity screening API before approve - document vendor and retention in subprocessors when added.
