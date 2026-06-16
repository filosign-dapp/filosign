# FiloSign

FiloSign is a wallet-native document signing platform for encrypted agreements, verifiable signing records, and permissioned document sharing.

It lets users send documents, invite recipients, collect signatures, and export proof records while keeping document contents encrypted client-side. The repository is a Bun monorepo containing the web app, API server, React SDK, cryptography utilities, shared schemas, and Solidity contracts.

## Links

| | URL |
| --- | --- |
| **Website** | [filosign.xyz](https://filosign.xyz/) |
| **Try Filosign (sandbox)** | [sandbox.filosign.xyz](https://sandbox.filosign.xyz/) |
| **Web app** | [app.filosign.xyz](https://app.filosign.xyz/) |
| **Docs** | [filosign.xyz/docs](https://filosign.xyz/docs/) |
| **Blog** | [filosign.xyz/blog](https://filosign.xyz/blog/) |
| **Pricing** | [filosign.xyz/pricing](https://filosign.xyz/pricing/) |
| **AI summary (`llms.txt`)** | [filosign.xyz/llms.txt](https://filosign.xyz/llms.txt) |
| **X** | [@filosign](https://x.com/filosign) |

**Discoverability:** After deploy, submit [sitemap-index.xml](https://filosign.xyz/sitemap-index.xml) to [Google Search Console](https://search.google.com/search-console) and [Bing Webmaster Tools](https://www.bing.com/webmasters). Add the website URL to your X bio and any directory listings (e.g. Product Hunt when you launch).

## What FiloSign Does

- Creates encrypted document envelopes for signing workflows.
- Uses wallet-backed accounts with app-level signing keys.
- Lets recipients approve who can send them documents.
- Registers document and signature state through smart contracts.
- Supports acknowledgements, signer records, and compliance exports.
- Supports optional USDC settlement rules released automatically when signing conditions are met.
- Provides a React SDK for apps that want to integrate FiloSign flows.

## Repository Structure

```text
apps/
  client/             React web app
  server/             Hono API server
  contracts/          Solidity contracts and deployment helpers
packages/
  react-sdk/          React provider, API client, and hooks
  crypto-utils/       Encryption, KEM, signatures, hashing, encoding
  shared/             Shared schemas and helpers
  test/               Local SDK/protocol test harness
project/              Committed project docs (e.g. scripts reference)
docs/                 Local-only notes (gitignored)
```

## Architecture

FiloSign has five main layers:

- **Client app:** React 19, TanStack Router, TanStack Query, thirdweb (embedded wallet + Connect UI) with Viem via `viemAdapter`, Tailwind, Radix UI, and Motion.
- **API server:** Bun + Hono service for auth, users, files, sharing, uploads, indexing, and server-side protocol actions.
- **React SDK:** Hooks and provider logic for authentication, file workflows, sharing approvals, signing, and profiles.
- **Contracts (v1, immutable):** On-chain surface is **`FSEnvelopeRegistry`** (file registration, routing, quorum, signer replacement propose/execute/cancel) and **`FSPaymentValidator`** (multi-leg USDC pull payouts, rule CRUD). Identity, KEM, and sharing approvals are off-chain.
- **Crypto/shared libraries:** ML-KEM/Kyber, Dilithium, AES-GCM, stable encoding, Zod schemas, and EVM helpers.

## Core Workflow

1. A user connects a wallet and completes FiloSign onboarding.
2. The app derives local signing/encryption key material from wallet-backed registration data and on-chain salts, then encrypts the local seed with the user's PIN.
3. A sender requests permission to send documents to a recipient wallet.
4. The recipient approves the sender.
5. The sender creates an envelope, places fields, encrypts the document, uploads it, and registers it.
6. Recipients acknowledge, decrypt locally, sign, and produce verifiable signing records.
7. The workflow can export a proof/compliance record for review.

## Packages

### `@filosign/client`

The main web application: landing pages, onboarding, dashboard, document creation, signing, permissions, connections, and profile settings.

### `@filosign/server`

The API service: wallet authentication, user registration, file upload and retrieval, document registration, signing, sharing permissions, and transaction indexing.

### `@filosign/contracts`

Solidity contracts and deployment utilities for local, testnet, and mainnet environments.

### `@filosign/react`

The SDK consumed by the client and test app. It wraps the API client, contract setup, TanStack Query hooks, auth, files, sharing, users, and settlement rules.

### `@filosign/crypto-utils`

Cross-runtime cryptographic utilities for key derivation, ML-KEM/Kyber, Dilithium, AES-GCM, hashing, and stable data encoding.

### `@filosign/shared`

Shared validation schemas and product data helpers.

## Requirements

- Bun `>= 1.3.11`
- Node.js `>= 24`
- Postgres
- S3-compatible object storage
- EVM private keys for protocol transactions and storage flows
- thirdweb client ID (client) and secret key (server)

## Setup

Install dependencies:

```bash
bun install
```

Push the database schema (local):

```bash
bun run db -- push local
```

Run the local stack (Hardhat bootstrap + client):

```bash
bun run dev -- --local
```

Run client + API against staging or sandbox:

```bash
bun run dev -- --staging   # internal QA (Infisical staging)
bun run dev -- --sandbox   # public sandbox (Infisical sandbox)
```

See [`SCRIPTS.md`](SCRIPTS.md) for all dev/db commands.

Run the local test harness:

```bash
bun run test:dev
```

## Environment

Server configuration is defined in `apps/server/env.ts`. The main required values are:

- `DEPLOYMENT` - `local` | `staging` | `sandbox` | `production` (drives billing, Dodo mode, entitlement policy; see [`project/launch/environments.md`](project/launch/environments.md))
- `CHAIN` - must match `DEPLOYMENT` (`local`→`local`, `staging`/`sandbox`→`testnet`, `production`→`mainnet`); not auto-derived - set both explicitly
- `SERVER_URL` - public API origin (no trailing slash).
- `CLIENT_URL` - React app origin; email CTAs and CORS. Must not be `http://localhost` in deployed (`testnet` / `mainnet`) environments.
- `ASTRO_URL` - marketing site origin; email static assets (`/logo.webp`, `/icons/*`).
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_ENABLED` - `true` (default) sends via Resend; set `false` to no-op outbound email
- `PG_URI`
- `DB_NAME`
- `RELAYER_POOL` / `RELAYER_POOL_PRIVATE_KEYS` - comma-separated on-chain relayer addresses and keys (must match `FSEnvelopeRegistry` `isRelayer` ACL after deploy)
- `FOC_WALLET_PRIVATE_KEY` / `FOC_WALLET_ADDRESS` - Synapse storage payer only (not in relayer pool)
- `DRAGONFLY_URL` - `redis://127.0.0.1:6379` with `docker compose -f deploy/compose.dev.yml up -d`
- `THIRDWEB_CLIENT_ID` - same value as client `VITE_THIRDWEB_CLIENT_ID`
- `THIRDWEB_SECRET_KEY` - project secret key (server only)
- `DODO_API_KEY` / `DODO_WEBHOOK_KEY` - required for `staging` and `production`; optional for `local` and `sandbox`
- `DODO_PRODUCT_ID_INDIVIDUAL_MONTHLY` / `DODO_PRODUCT_ID_INDIVIDUAL_YEARLY`
- `DODO_PRODUCT_ID_TEAMS_MONTHLY` / `DODO_PRODUCT_ID_TEAMS_YEARLY`
- `DODO_PRODUCT_ID_TEAMS_PRO_MONTHLY` / `DODO_PRODUCT_ID_TEAMS_PRO_YEARLY`
- `BILLING_RETURN_URL_ORIGINS` (optional allowlist for checkout return URLs)
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_ENDPOINT`
- `TG_ANALYTICS_BOT_GROUP_ID`
- `TG_ANALYTICS_BOT_TOKEN`

Client ([`apps/client/.env.example`](apps/client/.env.example)): `VITE_DEPLOYMENT`, `VITE_CHAIN`, `VITE_SERVER_URL`, `VITE_ASTRO_URL`, `VITE_CLIENT_URL`, `VITE_THIRDWEB_CLIENT_ID`. Tier templates: [`.env.staging.example`](apps/client/.env.staging.example), [`.env.sandbox.example`](apps/client/.env.sandbox.example), [`.env.production.example`](apps/client/.env.production.example).

Server ([`apps/server/.env.example`](apps/server/.env.example)): `DEPLOYMENT`, `CHAIN`, plus keys listed above.

Astro (`apps/astro/.env.example`): `PUBLIC_ASTRO_URL`, `PUBLIC_CLIENT_URL`, `PUBLIC_SERVER_URL`.

Emails preview (`packages/emails/.env.example`): `ASTRO_URL` (same unprefixed name as server; copy to `packages/emails/.env.local` or repo-root `.env.local`).

**Secrets**

| Tier | Server | Contracts (deploy) | Client + Astro |
|------|--------|-------------------|----------------|
| Local | `apps/server/.env.local` | `packages/evm/.env.local` | `.env.local` |
| Staging | Infisical `staging` | `packages/evm/.env.staging` | [`apps/client/.env.staging.example`](apps/client/.env.staging.example) |
| Sandbox | Infisical `sandbox` | `packages/evm/.env.staging` | [`apps/client/.env.sandbox.example`](apps/client/.env.sandbox.example) |
| Production | Infisical `prod` | `packages/evm/.env.production` | CF Pages |

Rename keys in Infisical / env files when upgrading (no runtime aliases).

**Local dev ports:** server `3000`, client `3001`, astro `3002` (see each app’s `.env.example`).

## Common Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Local bootstrap (chain + DB + deploy) + server + client + astro. |
| `bun run dev -- --serloc` | Bootstrap + server only. |
| `bun run dev -- --web` | Client + astro (no bootstrap). |
| `bun run dev -- --staging` | Client + server (Infisical staging). |
| `bun run dev -- --sandbox` | Client + server (Infisical sandbox). |
| `bun run db -- push local` | Push Drizzle schema (local). |
| `bun run sanity` | Lint + types + unit tests + Hardhat (CI / pre-push). |
| `bun run sanity -- --fast` | Same without Hardhat. |
| `bun run test:dev` | SDK/protocol test harness. |
| `bun run check` | Biome (repo root). |

All root commands: [`SCRIPTS.md`](SCRIPTS.md).

## Contracts

Run a local Hardhat node:

```bash
bun run contracts -- node
```

Compile contracts:

```bash
bun run contracts -- compile
```

Deploy contracts (local Hardhat):

```bash
bun run contracts -- --migrate --local
```

Deploy to Base Sepolia or Base:

```bash
bun run contracts -- --migrate --testnet
bun run contracts -- --migrate --mainnet
```

## Security Model

- Documents are encrypted in the browser before upload.
- The API stores encrypted files and encrypted key envelopes, not plaintext document keys.
- Recipients must acknowledge documents before receiving their encrypted key envelope.
- Protocol actions are authorized with wallet signatures and verified server-side before contract writes.
- Signing flows include application-level cryptographic signatures and on-chain state updates.

## Status

FiloSign is under active development. Some product areas, operational flows, marketing pages, and production hardening work are still evolving.

## License

No license file is currently present. Add a license before publishing as open source.
