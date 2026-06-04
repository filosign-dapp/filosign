# Contract change policy (immutable v1)

**Status:** Locked for mainnet launch. Core signing contracts are **immutable**; this doc maps `project/*` roadmap items to how we evolve without mutating v1 bytecode.

## Principles

1. **v1 addresses are frozen forever** for envelopes registered on mainnet v1.
2. **New chains** — deploy `FSEnvelopeRegistry` + `FSPaymentValidator`; new row in `definitions/{chainKey}.ts`.
3. **New settlement logic** — deploy new `FSPaymentValidator` (or v2) at a new address; v1 validator untouched; new envelopes only.
4. **New attestations / QES / NFT proof** — sidecar contract + server indexer; v1 sign record unchanged.
5. **Marketing** — do not imply a mutable “core”; Team Pro “multichain / custom escrow” = per-chain bundle or new validator, not upgrades to v1 registries.

## What does not need v1 contract changes

Server, DB, client, and auth only: fields/placement manifest, **reminders/expiration**, audit PDF, metadata/tags/templates/branding, webhooks/API keys, bulk send, supplementary attachments (beyond current), team keys, SSO/LDAP/BYOK, SIEM/logs, embed/postMessage, anchor-text assembly, entitlements/Dodo/legal/ops items in `project/todo.md`. Post-send **E2EE envelope comments** (`features.comments`) are shipped off-chain.

**Already on-chain in v1 (not future work):** parallel/sequential **routing**, registry **quorum** (no optional signers — contract reverts `OptionalSignersNotSupported`), **`amendSigner`**, multi-leg settlement CRUD on `FSPaymentValidator`.

## Allowed on-chain evolution (without touching v1 core)

| Need | Approach |
| ---- | -------- |
| New release types / tokens | New immutable validator per chain |
| Multichain | Full v1 stack per chain in definitions |
| QES / attestations | Sidecar + indexer |
| Wallet screening | Server on `settlements.registerForFile` path ([`settlements/architecture-and-non-custody.md`](settlements/architecture-and-non-custody.md)) |

## New registry address only if (rare)

- New EIP-712 / signature model for **new** envelopes → `FSEnvelopeRegistryV2` + frozen v1 for existing docs.
- On-chain ack storage or delegation graph if a **specific deal** requires it.

## Explicitly not planned

- UUPS / proxies on signing registries or v1 `FSPaymentValidator`
- On-chain field values (conflicts with E2EE)
- Filosign custody of USDC

## Reference

Implementation and deploy: [`apps/contracts/ARCHITECTURE.md`](../apps/contracts/ARCHITECTURE.md), [`apps/contracts/README.md`](../apps/contracts/README.md).
