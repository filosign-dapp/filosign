# Contract tests

Rules for `apps/contracts` Hardhat tests. See [README.md](./README.md) for architecture.

## Run

```bash
bun run --cwd apps/contracts test        # compile + hardhat test
bun run --cwd apps/contracts check-types # tsc on exports/definitions/services
```

`test` runs `compile` first. **`bun run test` uses the in-process Hardhat network only**; no Alchemy keys required for CI.

**Deploy / migrate:** `migrate` runs `test` before `deploy`. Direct `deploy` does not run tests.

## Philosophy

Hardhat + viem + TypeScript. Test what loses money or breaks trust:

- Access control (`onlyServer`, payer-only `registerRule`, permissionless `executePayout`)
- Reverts on bad inputs and release misconfiguration
- Signature and registry paths
- **FSPaymentValidator:** `canExecute` gating, `executePayout` transfer, double-execution prevention
- Skip tautologies and OpenZeppelin internals

## Layout

| Path | Role |
| ---- | ---- |
| `test/*.spec.ts` | Behavior: reverts, balances, integration |
| `test/fixtures.ts` | Direct `FSFileRegistry` + `FSPaymentValidator` deploy; `deployer` ≠ `server` (KMS); `coSigner` for multi-signer payout tests |
| `test/helpers/signatures.ts` | EIP-712 signing aligned with Solidity |
| `test/helpers/walletAccount.ts` | viem account helpers |
| `test/helpers/chainTime.ts` | `latestBlockTimestamp`, `advanceBlockTime` (expiry tests) |

## Non-negotiables

1. **Chain time** — Use `latestBlockTimestamp(publicClient)` for anything compared to `block.timestamp`.
2. **Viem `.read` args** — Single ABI array args as one tuple: `read.foo([arg])`.
3. **Definitions** — Never hand-edit `definitions/`; updated by deploy only.

## Adding tests

- Reuse `fixtures.ts`; extend when a second copy would appear.
- Payment tests: assert USDC balances and `executed` flags, not only storage mirrors.
- Same PR as Solidity changes for behavioral edits.

## Static analysis (recommended before mainnet)

```bash
# From apps/contracts after compile
bun run compile
slither . --exclude-dependencies
```

Triage reentrancy, unchecked returns, and unprotected state-changing findings. Not wired in CI yet.

### Expected: `arbitrary-send-erc20`

`FSPaymentValidator.executePayout` uses `transferFrom(rule.payer, recipient, amount)` — intentional pull-payment design (payer approves; permissionless execute). **Do not** change to `msg.sender` as `from` to silence Slither.

Full rationale and other informational findings: [README — Static analysis (Slither)](./README.md#static-analysis-slither).

## Before merge

- `bun run --cwd apps/contracts test` and `check-types` green
- Unauthorized callers revert where expected
- Fund flows use explicit balance checks for `FSPaymentValidator`
- `FSPaymentValidator`: `AtLeastN` distinct commitments, allowance failure leaves `executed` false
