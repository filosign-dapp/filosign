# Settlements — architecture and non-custody

Filosign is a **software provider** for document signing. Optional USDC payouts use a **pull-payment** model on `FSPaymentValidator`; Filosign does not custody user funds.

Public terms: [Terms of Service](/terms) and [Privacy Policy](/privacy) on the marketing site.

## What happens on-chain

1. **Sender** registers the file on `FSFileRegistry` (via server relay).
2. **Sender** calls `registerRule` as the payer (`msg.sender == payer`) with one or more **payout legs** (recipient + amount per leg).
3. **Sender** `approve`s the validator for the **sum of leg amounts** per rule.
4. When **release conditions** are satisfied (`FSFileRegistry` signatures), **anyone** may call `executePayout` (Filosign server relay, user wallet, or any address paying its own gas).
5. The validator `transferFrom`s USDC from payer to each leg recipient atomically.

Release checks are enforced in the contract (`canExecute` / `RuleNotExecutable`). Paying gas does not bypass unsigned documents.

**Filosign does not control or screen, and hence is not responsible for, all on-chain payouts.** Product policy and indexing apply to the supported send path only.

## Supported send path (indexing)

1. **`files.register`** — file registration (+ optional advanced routing on-chain). No settlement rows are written here.
2. **Client (on-chain)** — payer `registerRule` + `approve` on `FSPaymentValidator` (at send or post-send attach).
3. **`settlements.registerForFile`** — server verifies on-chain state (`assertSettlementRulesVerifiedOnChain`), enforces recipient allowlist and entitlements, then inserts into `file_settlement_rules`.

Rules created only outside the app are **not** indexed in Postgres or shown in the UI.

Post-send attach uses the same path: on-chain register + approve, then `settlements.registerForFile`.

## What Filosign does

- Indexes payout rules in Postgres (`file_settlement_rules`, `legs` jsonb) only after **`settlements.registerForFile`**, following on-chain verification.
- Server relay attempts `executePayout` after signatures and via hourly cron for indexed rules.
- Sign page **Settle payment** → `settlements.trySettle` (server relay + chain sync).
- **Settle from wallet** → payer/recipient calls `executePayout`, then `settlements.confirmSettlement` (hash + `rules()` sync).
- **Teams Pro:** payer may `updatePayoutRule` / `cancelPayoutRule` on-chain via app; server syncs via `settlements.updateRule` / `settlements.cancelRule`.
- **Does not** hold USDC, approve on behalf of users, or gate on-chain execution (permissionless `executePayout`).

## Supported path vs bypass

| | Supported (app/API) | Direct contract / third-party |
|--|---------------------|-------------------------------|
| Recipient allowlist | Yes, at `settlements.registerForFile` (per leg) | No |
| Indexed in DB / UI | Yes, when verified on-chain via Filosign | No, unless also sent via Filosign |
| Server auto relay | Executes indexed rules when `canExecute` | Same |
| Wallet screening (planned) | Filosign send + `registerForFile` path only | Not applied |

## Recipient allowlist (product)

When using Filosign software, each payout leg recipient must be:

- A **signer or viewer** on the envelope, or
- The organization **linked payout wallet** (`organizations.orgWalletAddress`).

Arbitrary external addresses are not supported in the UI or server registration path. See [`recipient-allowlist-policy.md`](recipient-allowlist-policy.md).

## Cancelling a payout

Before execution, the payer can:

1. **`cancelPayoutRule(ruleId)`** — payer-only on-chain cancel (Teams Pro in app).
2. **Revoke allowance** — `token.approve(FSPaymentValidator, 0)` from the payer wallet; the sign UI exposes this for senders.

Either blocks `executePayout`. Revocation cannot reverse a payout that has already executed on-chain.

## Wallet screening

Sanctions screening (third-party API) is planned for production rollout on the **Filosign send and registration path only**—not for every `registerRule` on the chain. Not required for pre-production development.
