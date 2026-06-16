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

Mainnet migrate prompts for interactive confirmation in the contracts orchestrator before Hardhat runs: type `confirm` to proceed, or Ctrl+C to abort the whole migrate (no verify step). Non-interactive stdin (CI, piped input) is refused. Direct `hardhat run deploy.ts --network base` still prompts unless `FC_MAINNET_DEPLOY_CONFIRMED=1` was set by the orchestrator.

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

Schema: [`env.ts`](./env.ts). Required for live deploy: `FC_DEPLOYER_PRIVATE_KEY`, `RELAYER_POOL`; optional `FC_OWNER_ADDRESS`, `ALCHEMY_API_KEY`, `ETHERSCAN_API_KEY`.

`RELAYER_POOL` must match `apps/server` `RELAYER_POOL` and every address must have `FSEnvelopeRegistry.isRelayer(addr) === true` after deploy.

## Redeploy / address rotation

Use when rotating registry or validator addresses on a chain (new deployment id; v1 bytecode stays immutable).

1. **Green tests:** `bun run contracts -- test` (migrate refuses without this on testnet/mainnet).
2. **Deploy:** `bun run contracts -- --migrate --testnet` or `--mainnet` (mainnet prompts for `confirm`).
3. **Definitions:** migrate writes `definitions/chains/<chain>/deployments/<id>/manifest.json` and updates `latest.json`. Run `bun run gen:definitions` if you need to regenerate TS without redeploying.
4. **Public verify export:** `bun run export:public` (or orchestrator equivalent) so `oss/packages/contracts/abis/` and `chains/manifest.json` match the new deployment.
5. **Server alignment:** set Infisical `CHAIN` to match the chain key you deployed; ensure `RELAYER_POOL` lists every on-chain relayer (`isRelayer(addr) === true`).
6. **Owner runbook:** verify `owner()`, `server()`, and Basescan for new addresses before production traffic. See [`oss/packages/contracts/ARCHITECTURE.md`](../../oss/packages/contracts/ARCHITECTURE.md) post-deploy steps.

Policy for what may change on-chain vs off-chain: [`project/product/contracts/future-scope.md`](../../project/product/contracts/future-scope.md).

## Definitions model

All paths resolve under **`packages/evm/definitions/`** (absolute at runtime; deploy `chdir`s here).

| Path | Role |
|------|------|
| `chains/<chain>/deployments/<id>/manifest.json` | Per-deploy contract addresses + ABI refs (`local` uses fixed id `local`, overwritten each deploy) |
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

- `getContracts(chainKey)` - typed viem contract bundle for server/SDK
- `getDefinitionsEntry(chainKey)` - addresses from latest manifest
- `readRegistryEip712Domain`, `filosignRegistrationSignature` - EIP-712 helpers

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
