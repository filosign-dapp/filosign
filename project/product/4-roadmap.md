# Product Scope & Roadmap

Source of truth for product-growth priorities.

## Current Product Status

Product link: <https://filosign.xyz>

Current state:

- public beta / testnet product
- website has embedded product video
- no standalone product demo video yet
- no mainnet usage or revenue yet
- mainnet launch is the next major milestone

## Product Pillars

### 1. Encrypted Document Workflow

Users can send documents, invite recipients, manage permissions, and keep contents private from Filosign.

This is the broad product foundation.

### 2. Verifiable Signing

Filosign creates records that can be independently verified instead of depending only on a vendor database.

### 3. Proof Packet

Users can export a packet showing who signed, when, and the related proof records.

This matters for legal, audit, grant, and payment workflows.

### 4. Recipient Control

Recipients should control who can send them documents. This helps prevent spam and unwanted signing requests.

### 5. Non-Custodial Settlement

Senders can attach USDC payout rules. Funds are not custodied by Filosign. Settlement can execute when signing conditions are met.

Settlement is the wedge, not the whole product.

## Product Strategy

Build document workflows deeply enough that Filosign is useful even without USDC settlement.

Use settlement to win early crypto-native customers where the pain is sharp.

Correct framing:

- product: secure agreement workflows
- wedge: signed docs trigger USDC payout
- expansion: fiat settlement, on/off-ramps, API, embedded signing, compliance workflows

## Pilot Workflows To Support First

Prioritize:

1. grant agreement + milestone payout
2. contractor agreement + W-8BEN/W-9 + payout
3. bounty/hackathon winner paperwork + payout
4. DAO contributor/vendor agreement + treasury proof
5. secure document workflow without automated settlement

## What To Learn From Pilots

For each pilot, capture:

- document type
- signer roles
- approval roles
- payout method
- current tools used
- current time delay
- source of trust/risk
- required proof packet
- compliance concerns
- must-have feature before paid conversion

## Packaging

Initial business model:

- individual secure signing plan
- team plan for shared workflows
- pro/team plan for settlement and advanced audit workflows
- platform/API plan later
- enterprise custom later

Do not lead with a full pricing table in sales. Lead with the pilot workflow.

Pricing source:

- `../entitlements/entitlement_breakdown_report.md`
- `../entitlements/cost_breakdown_report.md`
- `../entitlements/competitive_pricing_analysis.md`

## Launch-Critical Product Work

Near-term priorities:

- mainnet-ready settlement path
- clear non-custodial payment wording
- request-access / design-partner onboarding
- support channel
- analytics and feedback capture
- polished pricing/packaging page
- legal review of terms, privacy, payment wording
- proof packet demo material

Operational source:

- `../todo.md`

## Product Boundaries

Do not build every enterprise feature before customer proof.

Delay:

- QES/eIDAS qualified signatures
- SSO/SAML
- BYOK
- SIEM
- custom subdomains
- large API platform
- full fiat settlement/on-ramp stack

Build these only when a design partner or paid deal requires them.

## Main Product Question

Every roadmap item should answer:

Does this help a team complete a high-stakes agreement faster, more privately, with better proof, or with cleaner payout execution?

If not, defer it.

