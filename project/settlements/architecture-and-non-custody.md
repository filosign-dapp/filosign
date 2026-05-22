# Settlements — architecture and non-custody

Filosign is a **software provider** for document signing. Optional USDC payouts use a **pull-payment** model on `FSPaymentValidator`; Filosign does not custody user funds.

Public terms: [Terms of Service](/terms) and [Privacy Policy](/privacy) on the marketing site.

## What happens on-chain

1. **Sender** calls `registerRule` as the payer (`msg.sender == payer`).
2. **Sender** `approve`s the validator for the exact USDC amount per rule.
3. When **release conditions** are satisfied (`FSFileRegistry` signatures), **anyone** may call `executePayout` (Filosign server relay, user wallet, or any address paying its own gas).
4. The validator `transferFrom`s USDC from payer to recipient.

Release checks are enforced in the contract (`canExecute` / `RuleNotExecutable`). Paying gas does not bypass unsigned documents.

**Filosign does not control or screen, and hence is not responsible for, all on-chain payouts.** Product policy and indexing apply to the supported send path only.

## What Filosign does

- Indexes payout rules in Postgres (`file_settlement_rules`) only when sent through `files.register`, after on-chain verification (`assertSettlementRulesVerifiedOnChain`).
- Server relay attempts `executePayout` after signatures and via hourly cron for indexed rules.
- Manual settle from the app (sender or recipient) with `settlements.confirmSettlement` after an on-chain tx.
- **Does not** hold USDC, approve on behalf of users, or gate on-chain execution (permissionless `executePayout`).

## Supported path vs bypass

| | Supported (app/API) | Direct contract / third-party |
|--|---------------------|-------------------------------|
| Recipient allowlist | Yes, at `files.register` | No |
| Indexed in DB / UI | Yes, when verified on-chain | No, unless also sent via Filosign |
| Server auto relay | Executes indexed rules when `canExecute` | Same |
| Wallet screening (planned) | Filosign send + `files.register` only | Not applied |

## Recipient allowlist (product)

When using Filosign software, payout recipients must be:

- A **signer or viewer** on the envelope, or
- The organization **linked payout wallet** (`organizations.orgWalletAddress`).

Arbitrary external addresses are not supported in the UI or server registration path.

## Cancelling a payout

No on-chain `cancelRule`. Payer revokes `approve(validator, 0)` from their wallet; the sign UI exposes this for senders. Payout cannot settle without allowance.

## Wallet screening

Sanctions screening (third-party API) is planned for production rollout on the **Filosign send and registration path only**—not for every `registerRule` on the chain. Not required for pre-production development.
