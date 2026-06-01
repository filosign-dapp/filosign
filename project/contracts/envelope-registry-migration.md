# FSEnvelopeRegistry migration (from FSFileRegistry)

Pre-production note for operators and agents. **Library extraction** (`FSCommitmentLib`, `FSEnvelopeRoutingLib`) does not change the external ABI. The **envelope rebrand** does.

## What breaks on redeploy

| Area | Change |
| ---- | ------ |
| **Definitions** | `@filosign/contracts` key `FSEnvelopeRegistry` (not `FSFileRegistry`); new addresses in [`apps/contracts/definitions/`](../../apps/contracts/definitions/) after migrate |
| **EIP-712** | Domain `FSEnvelopeRegistry` version **2**; types `RegisterEnvelope`, `SignEnvelope`, `AckEnvelope` |
| **On-chain calls** | `registerEnvelope`, `registerEnvelopeSignature`, `envelopeRegistrations` |
| **Payment validator** | Immutable `envelopeRegistry()` (was `fileRegistry()`) |

## What does not break

- HTTP oRPC: `files.*`, `pieceCid`, Postgres `files` table
- React hooks: `useSignFile`, `useAckFile`, `useSendFile`
- `cidIdentifier(pieceCid)` hash (same `keccak256(abi.encodePacked(pieceCid))`)

## Server / client configuration

Runtime contract addresses come from **definitions + `CHAIN`**, not per-contract env vars:

- Server: [`apps/server/config.ts`](../../apps/server/config.ts) → `getDefinitionsEntry(chainKey)`
- SDK/client: `getContracts({ chainKey, wallet })` from `@filosign/contracts`

After redeploy:

1. Run tests + deploy (writes `definitions/<profile>.ts`):
   - Local: `bun run contracts -- --migrate --local` (localhost node) or `bunx hardhat run scripts/deploy.ts --network hardhat` for in-process Hardhat only
   - Testnet: `bun run contracts -- --migrate --testnet`
   - Mainnet: `bun run contracts -- --migrate --mainnet`
2. Ensure **`FC_SERVER_ADDRESS`** matches `FSEnvelopeRegistry.server()` on the deployed registry (bootstrap validates this).
3. Set server **`CHAIN`** to `local` | `testnet` | `mainnet` for the target definitions file.
4. **Discard in-flight EIP-712** signatures from the old domain/types.

No client `VITE_*` registry address is required when using the bundled definitions for that chain.

## Legacy `files.registryAddress` rows

Each file row stores the registry contract used at registration time. [`envelopeRegistryAt`](../../packages/react-sdk/src/lib/envelope-registry-at.ts) resolves reads/writes against that address using the **current** `FSEnvelopeRegistry` ABI.

Rows still pointing at an **old `FSFileRegistry` deployment** (old function selectors) will **not** work with current server/SDK code. Pre-production options:

1. **`bun run db -- purge local`** (or staging/sandbox) and re-register envelopes on the new deployment — recommended for local dev after migrate.
2. **Re-send / re-register** individual envelopes if you must keep Postgres data.
3. **Legacy ABI shim** — not implemented; only needed if you have mainnet traffic on the old contract name.

There is no on-chain migration of registration state between registry deployments; `pieceCid` identity is unchanged, but registration must be replayed on the new contract.

## Verification

```bash
bun run --cwd apps/contracts test
bun run check
```

Server guard: [`apps/server/tests/domains/files-registry-routing.test.ts`](../../apps/server/tests/domains/files-registry-routing.test.ts).
