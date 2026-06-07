# Payout packets — architecture and non-custody

Filosign is a **software provider** for document signing. Optional USDC **payout packets** use a **non-custodial push** model on `FSPaymentValidator`; Filosign does not custody user funds.

Public terms: [Terms of Service](/terms) and [Privacy Policy](/privacy) on the marketing site.

## What happens on-chain

1. **Sender** registers the file on `FSEnvelopeRegistry` (via server relay).
2. **Sender** calls `registerRule` as the payer (`msg.sender == payer`) with one or more **payout legs** (recipient + amount per leg) — **one on-chain rule id per payout packet**.
3. **Sender** `approve`s the validator for the **sum of leg amounts** per packet.
4. When **release conditions** are satisfied (`FSEnvelopeRegistry` signatures), **anyone** may call `executePayoutLeg(ruleId, legIndex)` (Filosign server relay, sender, recipient, or any address paying its own gas).
5. The validator `transferFrom`s USDC **from the payer wallet to that leg’s recipient** — one leg per transaction. Paid legs are tracked on-chain (`legPaidBitmap`); the packet is **fully executed** when every leg is paid.

The validator **never holds payout USDC** (no escrow, no claim vault). Only ERC-20 **allowance** from payer to validator.

Release checks are enforced in the contract (`canExecute` / `RuleNotExecutable`). Paying gas does not bypass unsigned documents.

**Filosign does not control or screen, and hence is not responsible for, all on-chain payouts.** Product policy and indexing apply to the supported send path only.

## Settle UX (three tiers, all push)

| Tier | Behavior |
|------|----------|
| **Auto** | After sign / hourly cron, server loops unpaid leg indices with `executePayoutLeg` |
| **Retry** | Sign page **Execute attached payout** → `settlements.trySettle` (server relay for all unpaid legs) |
| **Direct** | **Run payout leg** or block explorer → wallet calls `executePayoutLeg`, then `settlements.confirmSettlement` syncs DB |

## Supported send path (indexing)

1. **`files.register`** — file registration (+ optional advanced routing on-chain). No payout rows are written here.
2. **Client (on-chain)** — payer `registerRule` + `approve` on `FSPaymentValidator` (at send or post-send attach).
3. **`settlements.registerForFile`** — server verifies on-chain state (`assertSettlementRulesVerifiedOnChain`), enforces recipient allowlist and entitlements, then inserts into `file_settlement_rules`.

Packets created only outside the app are **not** indexed in Postgres or shown in the UI.

Post-send attach uses the same path: on-chain register + approve, then `settlements.registerForFile`.

## What Filosign does

- Indexes payout packets in Postgres (`file_settlement_rules`, `legs` jsonb with optional per-leg `paid` / `payoutTxHash`) only after **`settlements.registerForFile`**, following on-chain verification.
- Server relay attempts **each unpaid leg** after signatures and via hourly cron for indexed packets.
- Sign page **Execute attached payout** → `settlements.trySettle` (server relay + chain sync). Status may be `partial` until all legs succeed.
- **Run payout leg** → payer/recipient calls `executePayoutLeg` for unpaid indices, then `settlements.confirmSettlement` (hash + leg sync).
- **Teams Pro:** payer may `updatePayoutRule` / `cancelPayoutRule` on-chain via app; server syncs via `settlements.updateRule` / `settlements.cancelRule`.
- **Does not** hold USDC, approve on behalf of users, or gate on-chain execution (permissionless `executePayoutLeg` when `canExecute`).

## Payer sources (product)

On the **supported app path**, payout rules may only be registered with:

1. The **document sender’s** Filosign-linked wallet, or  
2. The workspace **linked org treasury** (`organizations.orgWalletAddress`).

The app does not offer arbitrary external payer addresses. Direct contract use outside the app is disclosed in Terms §10. See [org-wallet-linking.md](./org-wallet-linking.md).

## Workspace access gating

Before `settlements.registerForFile` or attach UI:

- Envelope must be a **workspace send** (`files.organizationId` set). Personal sends cannot index payout rules even on Teams plans.
- Org admin accepts the [Settlement Feature Addendum](/legal/settlement-feature-addendum) when **requesting** access (not again at first attach).
- Filosign **manually approves** the workspace (`organization_settlement_feature_access`).
- Ops checklist: [payout-feature-approval-checklist.md](./payout-feature-approval-checklist.md).

## Recipient disclosure at sign

When indexed payout rules exist, signers must accept the payout disclosure checkbox; server stores `file_settlement_recipient_acks` and includes them in compliance export v1.

## Supported path vs bypass

| | Supported (app/API) | Direct contract / third-party |
|--|---------------------|-------------------------------|
| Recipient allowlist | Yes, at `settlements.registerForFile` (per leg) | No |
| Indexed in DB / UI | Yes, when verified on-chain via Filosign | No, unless also sent via Filosign |
| Server auto relay | Executes indexed unpaid legs when `canExecute` | Same |
| Wallet screening (planned) | Filosign send + `registerForFile` path only | Not applied |

## Recipient allowlist (product)

When using Filosign software, each payout leg recipient must be:

- A **signer or viewer** on the envelope, or
- The organization **linked payout wallet** (`organizations.orgWalletAddress`).

Arbitrary external addresses are not supported in the UI or server registration path. See [`recipient-allowlist-policy.md`](recipient-allowlist-policy.md).

## Cancelling a payout packet

Before all legs are paid, the payer can **`cancelPayoutRule`** only while **`requiredSignaturesCount == 0`** on the envelope (same lock as **`updatePayoutRule`**). After signing starts, use **`clearEnvelopeSignatures`** to reopen cancel/update, or **`recallEnvelope`** to void the envelope. Revoke allowance separately: `token.approve(FSPaymentValidator, 0)` from the payer wallet; the sign UI exposes this for senders.

Either blocks further `executePayoutLeg`. Revocation cannot reverse legs already paid on-chain.

## Rule changes after signing starts

After the first **required** signer signs on-chain (`requiredSignaturesCount > 0`):

- **`updatePayoutRule`** and **`cancelPayoutRule`** revert.
- **`updateAttachmentRule`** and **`cancelAttachmentRule`** revert on supplementary packets.
- Optional-only signatures do **not** trigger the lock.

**Escape hatches (destructive or terminal):**

1. **`clearEnvelopeSignatures`** (sender or org controller, server relay) — clears on-chain signatures and bound wallets; reopens update and cancel on both satellites; blocked if any payout leg was paid.
2. **`recallEnvelope` (void)** — terminal; no further signing or rule edits on the active envelope.

## Recipient expectations

Signing a document does **not** guarantee USDC payment. Execution depends on release conditions, payer balance, token approval, and whether the payer cancels or revokes before remaining legs run.

## Rule expiry (`expiresAt`)

`expiresAt = 0` means no cutoff (default in the app when omitted).

For **completion-gated** release types (`AllSigned`, `AllRequiredSigned`, `AllSignedComplete`, and `QuorumRequired` when the envelope uses quorum routing), expiry compares **`completedAt`** on the registry, not the wall clock at execute time. Signers who finish before the cutoff can still receive payout if relay or wallet execution happens later.

For **signer-specific** and partial-progress release types, expiry is checked at execute time (deadline to meet the condition and release).

## Wallet screening

Sanctions screening (third-party API) is planned for production rollout on the **Filosign send and registration path only**—not for every `registerRule` on the chain. Not required for pre-production development.
