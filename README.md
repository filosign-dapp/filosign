# FiloSign

FiloSign is a wallet-native document signing platform for encrypted agreements, verifiable signing records, and permissioned document sharing.

It lets users send documents, invite recipients, collect signatures, and export proof records while keeping document contents encrypted client-side. The repository is a Bun monorepo containing the web app, API server, React SDK, cryptography utilities, shared schemas, and Solidity contracts.

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

- **Client app:** React 19, TanStack Router, TanStack Query, thirdweb (embedded wallet + Connect UI), Wagmi, Viem, Tailwind, Radix UI, and Motion.
- **API server:** Bun + Hono service for auth, users, files, sharing, uploads, indexing, and server-side protocol actions.
- **React SDK:** Hooks and provider logic for authentication, file workflows, sharing approvals, signing, and profiles.
- **Contracts:** Protocol contracts for sender approvals, key registration, file registration, signer records, and pull-based USDC payouts (`FSPaymentValidator`).
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

Run client + API against staging:

```bash
bun run dev -- --testnet
```

See [`SCRIPTS.md`](SCRIPTS.md) for all dev/db commands.

Run the local test harness:

```bash
bun run test:dev
```

## Environment

Server configuration is defined in `apps/server/env.ts`. The main required values are:

- `CHAIN`
- `SERVER_URL` — public API origin (no trailing slash).
- `CLIENT_URL` — React app origin; email CTAs and CORS. Must not be `http://localhost` in deployed (`testnet` / `mainnet`) environments.
- `ASTRO_URL` — marketing site origin; email static assets (`/logo.webp`, `/icons/*`).
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `PG_URI`
- `DB_NAME`
- `EVM_PRIVATE_KEY_SERVER`
- `EVM_PRIVATE_KEY_SYNAPSE`
- `JWT_SECRET`
- `THIRDWEB_CLIENT_ID` — same value as client `VITE_THIRDWEB_CLIENT_ID`
- `THIRDWEB_SECRET_KEY` — project secret key (server only)
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_ENDPOINT`
- `TG_ANALYTICS_BOT_GROUP_ID`
- `TG_ANALYTICS_BOT_TOKEN`

Client (`apps/client/.env.example`): `VITE_SERVER_URL`, `VITE_ASTRO_URL`, `VITE_THIRDWEB_CLIENT_ID`, `VITE_CHAIN`.

Astro (`apps/astro/.env.example`): `PUBLIC_ASTRO_URL`, `PUBLIC_CLIENT_URL`, `PUBLIC_SERVER_URL`.

Emails preview (`packages/emails/.env.example`): `ASTRO_URL` (same unprefixed name as server; copy to `packages/emails/.env.local` or repo-root `.env.local`).

Rename keys in gitignored `.env.local` / `.env.staging` / `.env.production` when upgrading (no runtime aliases).

**Local dev ports:** server `3000`, client `3001`, astro `3002` (see each app’s `.env.example`).

## Common Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Local bootstrap (chain + DB + deploy) + server + client + astro. |
| `bun run dev -- --serloc` | Bootstrap + server only. |
| `bun run dev -- --web` | Client + astro (no bootstrap). |
| `bun run dev -- --testnet` | Client + server (staging env). |
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
bun run --cwd apps/contracts compile
```

Deploy contracts:

```bash
bun run --cwd apps/contracts migrate
```

Deploy to Base Sepolia or Base:

```bash
bun run --cwd apps/contracts migrate:testnet
bun run --cwd apps/contracts migrate:mainnet
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
