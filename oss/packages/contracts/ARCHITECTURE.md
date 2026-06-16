# Filosign contracts - architecture (immutable v1)

Frozen **immutable bytecode** for mainnet: two production contracts. No UUPS proxies. Identity, keygen, and sharing approvals live **off-chain** (Postgres + server).

## Roles

| Actor | Key | Role |
| ----- | --- | ---- |
| **Ledger** | `FC_DEPLOYER_PRIVATE_KEY` | Deploys `FSEnvelopeRegistry` and `FSPaymentValidator` |
| **Owner (cold wallet recommended)** | deployer by default, optional `FC_OWNER_ADDRESS` handoff | Can add/remove relayers (`addRelayer` / `removeRelayer`) and transfer ownership (2-step) |
| **Relayer pool** | `RELAYER_POOL` (deploy + server) → `FSEnvelopeRegistry.isRelayer` | `onlyRelayer` relay for `registerEnvelope`, `registerEnvelopeSignature`, void/amend, and `setOrgControllers` |

Relayer ACL is owner-rotatable via `addRelayer` / `removeRelayer` (minimum one relayer). Ownership uses OpenZeppelin `Ownable2Step` (`transferOwnership` + `acceptOwnership`).

## Topology

```mermaid
flowchart TB
  subgraph deploy [Deploy order]
    FR[FSEnvelopeRegistry initialRelayers]
    PV[FSPaymentValidator envelopeRegistry chainId]
    FR --> PV
  end
  subgraph runtime [Runtime]
    Sender[Sender wallet]
    Relay[Filosign relayer pool]
    Signers[Signers]
    Anyone[Anyone]
    Sender -->|registerEnvelope| FR
    Signers -->|registerEnvelopeSignature| FR
    Relay -->|onlyRelayer writes| FR
    Sender -->|registerRule approve USDC| PV
    Anyone -->|executePayout when canExecute| PV
    PV -->|reads sign state| FR
  end
  subgraph offchain [Off-chain]
    DB[(Postgres)]
    Relay --> DB
  end
```

1. **`FSEnvelopeRegistry(initialRelayers[])`** - permanent auditable send + sign trail (EIP-712 **v5** `SignEnvelope` (binds `signersCommitment`), `RegisterEnvelope`, required signers, parallel/sequential routing, quorum, `proposeSignerReplacement` / `executeSignerReplacement` / `cancelSignerReplacement`, org controller governance).
2. **`FSPaymentValidator(envelopeRegistry, chainId)`** - permissionless pull settlement on sign; multi-leg rules, release types, payer CRUD, `expiresAt`; no custody.
3. **`FSAttachmentRelease(envelopeRegistry, chainId)`** (Teams Pro) - supplementary packet release rules; sender or org controller may register/cancel.

## Trust boundaries

- **Permanent sign record:** `FSEnvelopeRegistry` address at mainnet deploy is canonical for envelopes registered there.
- **E2EE / identity:** wallet registration, KEM material, and sender–recipient sharing are server-side; decrypt uses DB wraps + derived keys, not chain reads.
- **No Filosign custody:** validator only `transferFrom(payer, recipient)`; contract must not hold USDC.
- **Permissionless payout:** any address may call `executePayout` when `canExecute` is true (server relay is UX).
- **Payer-only rules:** `registerRule` requires `msg.sender == payer`.

## Organization governance (on-chain)

Team workspaces use a **mapping-only** controller ACL on the registry (not per-envelope lists, not `orgWallet` on registration).

| Concept | On-chain | Off-chain (Postgres) |
| ------- | -------- | --------------------- |
| **Controllers** | `setOrgControllers(orgIdCommitment, wallets[])` → `isOrgController` | Active **owner + admin** wallets; synced by server on org create / role change / member remove / invite accept |
| **Treasury** | Not stored on registry | `organizations.orgWalletAddress` - settlement payer/recipient only |
| **Org id** | `orgIdCommitment` on each envelope at register | UUID → `hashOrgIdCommitment` |

**Who may void / amend / attachment-govern:** document **sender**, or any wallet in the on-chain controller set for that envelope’s `orgIdCommitment`. Recall EIP-712 includes `orgIdCommitment` read from storage at relay time.

**Indexer / ops rule:** treat each **`OrgControllersSet`** event as the **full replacement** controller set for that `orgIdCommitment` (not a delta). Alternatively call **`getOrgControllers(orgIdCommitment)`**. Personal sends use zero `orgIdCommitment`; controller ACL does not apply.

**Definitions:** `bun compile` then `bun run scripts/export-definitions-from-artifacts.ts [local|testnet|mainnet]` - refreshes ABI from artifacts (keeps deployed addresses for non-local chains). Deploy via `migrate:*` writes definitions automatically.

## Security practices (pre-mainnet)

- Run `bun run contracts -- test` (required before testnet/mainnet migrate).
- Run `slither .` from `oss/packages/contracts` (see [TESTING.md](./TESTING.md) and [README - Static analysis](./README.md#static-analysis-slither)).
- USDC is **6 decimals** on Base; never assume `1e18` in app or contract math.
- `FSPaymentValidator` uses OpenZeppelin `SafeERC20`, balance-delta per leg, and `ReentrancyGuard`.
- Slither **`arbitrary-send-erc20`** on `executePayout` is expected (pull from `rule.payer`, not `msg.sender`); see README for triage rationale.

## Future contract changes

See [`project/product/contracts/future-scope.md`](../../project/product/contracts/future-scope.md).

## Deploy

```bash
# Env: FC_DEPLOYER_PRIVATE_KEY (deployer), RELAYER_POOL (comma-separated relayer addresses), optional FC_OWNER_ADDRESS (cold owner)
bun run contracts -- --migrate --testnet   # test + deploy Base Sepolia
bun run contracts -- --migrate --mainnet   # test + deploy Base
```

**Redeploy:** See [`packages/evm/README.md`](../../packages/evm/README.md#redeploy--address-rotation) for address rotation and definitions alignment.

Local deploy: set `RELAYER_POOL` to Hardhat accounts (see `packages/evm/.env.example`); deploy funds each pool address with ETH.

Post-deploy owner runbook:
1. Deploy with `FC_DEPLOYER_PRIVATE_KEY` (hot/deployer wallet).
2. Set `FC_OWNER_ADDRESS` during deploy to start 2-step ownership handoff.
3. From owner wallet, call `acceptOwnership()`.
4. Verify `owner()` and `isRelayer(addr)` for every `RELAYER_POOL` address before enabling production traffic.
