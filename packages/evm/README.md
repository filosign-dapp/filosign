# `@filosign/evm`

Private ops package for Filosign on-chain contracts: deploy scripts, deployment manifests, typed `getContracts()`, and EIP-712 helpers.

Solidity source and Hardhat tests live in the public OSS package [`oss/packages/contracts`](../../oss/packages/contracts). This package owns everything written at deploy time.

## Commands

From the Filosign repo root:

```bash
bun run contracts -- compile          # OSS compile + gen:definitions
bun run contracts -- test             # OSS Hardhat
bun run contracts -- --migrate --local
bun run contracts -- --migrate --testnet
bun run contracts -- --migrate --mainnet
```

Package-local scripts (usually invoked by the orchestrator):

```bash
bun run gen:definitions    # regenerate definitions/generated/* from manifests
bun run export:public      # write oss/packages/contracts/abis/ + chains/manifest.json
```

## Environment

Copy [`.env.example`](./.env.example) to:

| File | Used for |
|------|----------|
| `.env.local` | Local Hardhat deploy |
| `.env.staging` | Base Sepolia (staging + sandbox server) |
| `.env.production` | Base mainnet |

Schema: [`env.ts`](./env.ts). Required for live deploy: `FC_DEPLOYER_PRIVATE_KEY`, `FC_SERVER_ADDRESS`; optional `FC_OWNER_ADDRESS`, `ALCHEMY_API_KEY`, `ETHERSCAN_API_KEY`.

`FC_SERVER_ADDRESS` must match `FSEnvelopeRegistry.server()` after deploy and align with the server relay key (`FC_SERVER_ADDRESS` / `FC_SERVER_PRIVATE_KEY` in `apps/server`).

## Definitions model

All paths resolve under **`packages/evm/definitions/`** (absolute at runtime; deploy `chdir`s here).

| Path | Role |
|------|------|
| `chains/<chain>/deployments/<id>/manifest.json` | Per-deploy contract addresses + ABI refs |
| `chains/<chain>/latest.json` | Pointer to active deployment |
| `chains/<chain>/address-index.json` | Historical address lookup |
| `abis/<hash>.json` | Content-addressed ABI store |
| `generated/<chain>.ts` | Typed addresses + ABI imports for runtime |
| `generated/abi-types.ts` | viem ABI types from compile artifacts |
| `mock-usdc.ts` | Local mock USDC address (local deploy only) |

**Do not hand-edit** generated output. Safe to edit by hand: `schema.ts`, `chain-key.ts`, `bundle-types.ts`, `index.ts`.

## Public export

`export:public` copies ABIs and chain manifest into **`oss/packages/contracts/abis/`** and **`oss/packages/contracts/chains/manifest.json`** for verify consumers. Nothing else under the OSS package should be written by deploy.

## Runtime API

- `getContracts(chainKey)` — typed viem contract bundle for server/SDK
- `getDefinitionsEntry(chainKey)` — addresses from latest manifest
- `readRegistryEip712Domain`, `filosignRegistrationSignature` — EIP-712 helpers

See [`index.ts`](./index.ts) and [`services/`](./services/).

## Layout

| Path | Role |
|------|------|
| `scripts/deploy.ts` | Hardhat deploy (invoked with OSS cwd; chdirs to evm) |
| `scripts/verify-deployment.ts` | Basescan verify for latest manifest (runs after deploy, outside Hardhat run) |
| `scripts/gen-definitions.ts` | Manifest → generated TS |
| `scripts/export-public.ts` | Private definitions → public OSS abis/chains |
| `scripts/local-dev.ts` | Local mock USDC + Hardhat funding helpers |
| `services/contracts.ts` | `getContracts()` |
| `services/registry-eip712.ts` | Registry EIP-712 domain |
