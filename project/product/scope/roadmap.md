# Product Scope & Roadmap

Source of truth for **product phase** and growth priorities. Implementation detail: [`AGENTS.md`](../../AGENTS.md). Backlog: [`../todo.md`](../todo.md).

## Current Product Status

| Surface | URL |
|---------|-----|
| Marketing | [filosign.xyz](https://filosign.xyz) |
| Sandbox app | [sandbox.filosign.xyz](https://sandbox.filosign.xyz) |
| Production app (target) | [app.filosign.xyz](https://app.filosign.xyz) |

Current state:

- Public beta on **testnet** (sandbox); wallet-native signing
- No mainnet usage or revenue yet
- **Mainnet launch** is the next major milestone

## Product Pillars

1. **Encrypted document workflow** - send, invite, permissions; contents private from Filosign
2. **Verifiable signing** - records independently verifiable, not vendor-db-only
3. **Proof packet** - export who signed, when, and proof records (legal, audit, grants)
4. **Recipient control** - recipients approve who may send them documents
5. **Non-custodial settlement** - optional USDC payout rules; wedge, not the whole product

Strategy: useful without settlement; settlement wins crypto-native pilots. See [`1-positioning.md`](1-positioning.md).

## Packaging (catalog v1)

Plans: **Free**, **Solo** (`individual`), **Teams**, **Teams Pro**, **Enterprise**. Solo includes `settlement.basic`; Teams adds collaboration + pooled docs; Teams Pro adds `settlement.advanced` and `routing.advanced`.

Source: [`packages/entitlements/src/catalog/v1.ts`](../../../packages/entitlements/src/catalog/v1.ts) · strategy: [`../packaging/pricing-and-packaging.md`](../packaging/pricing-and-packaging.md).

Do not lead with a full pricing table in sales. Lead with a pilot workflow — see [`2-use-case.md`](2-use-case.md).

## Pilot Workflows (first)

1. Grant agreement + milestone payout
2. Contractor agreement + W-8BEN/W-9 + payout
3. Bounty/hackathon winner paperwork + payout
4. DAO contributor/vendor agreement + treasury proof
5. Secure document workflow without automated settlement

Capture per pilot: document type, roles, payout method, current tools, delay, proof needs, compliance, must-have before paid conversion.

## Shipped (sandbox / testnet)

Core v1 is built on testnet. For the implementation list see [`AGENTS.md` vertical slice](../../../AGENTS.md#vertical-slice) and settlements policy [`../settlements/settlements/architecture-and-non-custody.md`](../settlements/settlements/architecture-and-non-custody.md).

High level: encrypted envelopes, on-chain registry routing/quorum, signer replacement, non-custodial multi-leg settlements, compliance export bundle v1, teams billing (Dodo wired), request-access gating.

## Launch-critical (mainnet GA)

- Immutable v1 **mainnet** contract deploy
- Dodo **live** SKUs + prod webhook smoke
- Terms, Privacy, settlement addendum, counsel review
- Production infra (Dokploy, backups, monitoring) — [`../../ops/production-checklist.md`](../../ops/production-checklist.md)
- Request-access / design-partner onboarding ops
- Support channel, analytics, pricing page polish
- Proof packet demo material

## Product Boundaries (defer)

QES/eIDAS, SSO/SAML, BYOK, SIEM, custom subdomains, large API platform, full fiat on-ramp — build only when a design partner or paid deal requires them. See [`../contracts/future-scope.md`](../contracts/future-scope.md).

## Main Product Question

Does this help a team complete a high-stakes agreement faster, more privately, with better proof, or with cleaner payout execution? If not, defer it.
