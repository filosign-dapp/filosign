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

- **Client:** Payment attach UI only offers envelope participants and org payout wallet (when linked).
- **Server:** `assertPaymentRecipientsAllowlisted` on `files.register` when `paymentRules` are present.

## On-chain bypass

A payer may still call `registerRule` directly on-chain to any address. Filosign documents that the supported product path is allowlisted only; direct contract use is the payer’s wallet interaction outside the app.

## Organization payout wallet

Stored on `organizations.orgWalletAddress`. Intended for a team-controlled Safe. Linking UI/API may be added separately; payments can use the wallet once set in the database.
