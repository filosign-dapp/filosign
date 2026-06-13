# Organization wallet linking (product spec)

Filosign does **not** custody organization treasuries. Workspace payouts use **linked external addresses** (typically a Safe) as payer or recipient. On-chain behavior is always **non-custodial push**: `approve` + `transferFrom(payer, recipient)` per leg via `FSPaymentValidator.executePayoutLeg`.

## Data model

- `organizations.orgWalletAddress` - optional linked treasury address
- `organizations.orgWalletLinkedAt` - when proof-of-control completed
- Payout legs may use `recipientSource: "org_wallet"` for indexing/compliance only

## Link flow (Teams Pro)

1. Org **owner/admin** starts “Link workspace payout wallet”.
2. **Proof of control:** sign a Filosign message with the proposed address, or verify via Safe Transaction Service / WalletConnect session to that Safe.
3. Server stores `orgWalletAddress` + `orgWalletLinkedAt`; no keys held by Filosign.

## RBAC (product layer)

| Action | Who |
|--------|-----|
| Link / change org wallet | Org owner (or admin, if product allows) |
| Attach payout packet with payer = org wallet | Members with compose + settlement entitlement; actual spend still requires **Safe signatures** on-chain |
| Attach payout to org wallet as recipient | Same allowlist rules as other warm recipients |

On-chain `registerRule` / `updatePayoutRule` / `cancelPayoutRule` require `msg.sender == payer`. Filosign server never signs treasury spends.

## Payer source picker (supported app path)

1. **Personal wallet** - connected member EOA/smart wallet (default)
2. **Org treasury** - `orgWalletAddress` if linked; client builds txs for Safe execution

The app does **not** offer a free-form external payer picker. Direct contract registration with other payers is possible on-chain but outside the supported path (Terms §10).

## Cross-org treasury

Org A Safe as `payer`, Org B linked address as leg `recipient` is valid **address-to-address**. No org IDs on-chain. Allowlist policy governs whether B’s wallet may appear on A’s envelope.

## Out of scope

- Filosign-minted custodial treasury wallets
- Pull/claim or validator escrow of USDC
- On-chain org structs or treasury enums

See [architecture-and-non-custody.md](./architecture-and-non-custody.md) and [recipient-allowlist-policy.md](./recipient-allowlist-policy.md).
