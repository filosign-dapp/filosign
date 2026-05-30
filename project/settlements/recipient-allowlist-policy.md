# Recipient allowlist policy

## Allowed recipient sources

| `recipientSource` | Meaning |
| ----------------- | ------- |
| `signer` | Envelope signer wallet |
| `viewer` | Envelope viewer wallet |
| `org_wallet` | Organization-linked payout wallet (e.g. team Safe) |

## Not allowed

- `external` — removed; free-form addresses are not supported.

## Enforcement

- **Client:** Settlement attach UI only offers envelope participants and org payout wallet (when linked).
- **Server:** `assertSettlementRecipientsAllowlisted` on **`settlements.registerForFile`** (each leg in `legs[]`).
- **Server:** `assertSettlementRulesVerifiedOnChain` — payer, `cidId`, token, release type/params, and **each leg** (recipient + amount) must match on-chain `FSPaymentValidator.rules` plus successful `registerRule` / `approve` receipts.

Multi-leg rules: allowlist is checked **per leg**. Product cap: **5 legs** per rule (`MAX_SETTLEMENT_LEGS_PRODUCT`); on-chain max **32**.

## On-chain bypass

A payer may still call `registerRule` directly on-chain to any address. Filosign documents that the supported product path is allowlisted only; direct contract use is the payer’s wallet interaction outside the app.

**Filosign does not control or screen, and hence is not responsible for, all on-chain payouts.**

## Organization payout wallet

Stored on `organizations.orgWalletAddress`. Intended for a team-controlled Safe. Linking UI/API may be added separately; payments can use the wallet once set in the database.

## Wallet screening (planned)

When enabled, screening applies to wallets on the **Filosign send + `settlements.registerForFile` path**, not to all rules registered on-chain by non-app wallets.
