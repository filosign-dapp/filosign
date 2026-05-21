# Payments — architecture and non-custody

Filosign is a **software provider** for document signing. Optional USDC payouts use a **pull-payment** model on `FSPaymentValidator`; Filosign does not custody user funds.

## What happens on-chain

1. **Sender** calls `registerRule` as the payer (`msg.sender == payer`).
2. **Sender** `approve`s the validator for the exact USDC amount per rule.
3. When **release conditions** are satisfied (`FSFileRegistry` signatures), **anyone** may call `executePayout` (Gelato for gasless relay, or any address paying its own gas).
4. The validator `transferFrom`s USDC from payer to recipient.

Release checks are enforced in the contract (`canExecute` / `RuleNotExecutable`). Paying gas does not bypass unsigned documents.

## What Filosign does

- Indexes payout rules in Postgres (`file_payment_rules`).
- Optional Gelato Web3 Functions to relay `executePayout`.
- Webhooks update status for UI and compliance bundles.
- **Does not** hold USDC, approve on behalf of users, or gate on-chain execution (post permissionless `executePayout`).

## Recipient allowlist (product)

When using Filosign software, payout recipients must be:

- A **signer or viewer** on the envelope, or
- The organization **linked payout wallet** (`organizations.orgWalletAddress`).

Arbitrary external addresses are not supported in the UI or server registration path.

## Wallet screening

Sanctions screening (third-party API) is planned for production rollout; not required for pre-production development.
