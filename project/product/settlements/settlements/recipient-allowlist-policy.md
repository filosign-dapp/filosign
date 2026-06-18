# Recipient allowlist policy

## Allowed recipient sources

| `recipientSource` | Meaning |
| ----------------- | ------- |
| `signer` | Envelope signer wallet |
| `viewer` | Envelope viewer wallet |
| `org_wallet` | Organization-linked payout wallet (e.g. team Safe) |

## Not allowed

- `external` - removed; free-form addresses are not supported.

## Payer allowlist (supported path)

On the supported app path, the on-chain **payer** must be:

- The document **sender** wallet registering/indexing the rule, or  
- The workspace **linked org treasury** (`organizations.orgWalletAddress`).

Arbitrary external payer addresses are not offered in the product UI.

## Enforcement

- **Client:** Payout attach UI only offers envelope participants and org payout wallet (when linked); payer is the connected sender wallet (org treasury when product supports treasury registration).
- **Server:** `assertSettlementRecipientsAllowlisted` on **`settlements.registerForFile`** (each leg in `legs[]`).
- **Server:** `assertSettlementRulesVerifiedOnChain` - payer ∈ {sender, org treasury}, `cidId`, token, release type/params, and **each leg** must match on-chain `FSPaymentValidator.rules` plus successful `registerRule` / `approve` receipts.
- **Server:** `assertOrganizationSettlementFeatureApproved` before register/update when `organizationId` is present.

Multi-leg rules: allowlist is checked **per leg**. Product cap: **32 legs** per rule (`MAX_SETTLEMENT_LEGS_PRODUCT`); matches on-chain max.

## On-chain bypass

A payer may still call `registerRule` directly on-chain to any address. Filosign documents that the supported product path is allowlisted only; direct contract use is the payer’s wallet interaction outside the app.

**Filosign does not control or screen, and hence is not responsible for, all on-chain payouts.**

## Organization payout wallet

Stored on `organizations.orgWalletAddress`. Intended for a team-controlled Safe. See [org-wallet-linking.md](./org-wallet-linking.md) for link flow and RBAC. Payout execution uses permissionless `executePayoutLeg` per leg (non-custodial allowance-based transfer); see [architecture-and-non-custody.md](./architecture-and-non-custody.md).

## Wallet screening (planned)

When enabled, screening applies to wallets on the **Filosign send + `settlements.registerForFile` path**, not to all rules registered on-chain by non-app wallets.
