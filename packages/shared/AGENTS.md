# `@filosign/shared` — agent map

Browser + server Zod schemas, types, and pure helpers. No DB, no I/O. Imported by `apps/server`, `packages/react-sdk`, and `apps/client`.

## Key modules

| Module | Role |
|--------|------|
| [`settlement-rules.ts`](settlement-rules.ts) | Release types, `legs[]` input, register/update/cancel Zod; `settlementRuleLegacyTopLevel`, `settlementRuleTotalAmount` |
| [`settlement-status-label.ts`](settlement-status-label.ts) | Human labels for release types and settlement statuses |
| [`register-routing.ts`](register-routing.ts) | `RegisterRoutingInput`, calldata builders, `usesAdvancedRegisterRouting` |
| [`compliance-bundle.ts`](compliance-bundle.ts) | Compliance export schema (**v7**): settlements legs, `onchainRegistration`, chain tx kinds |
| [`placement-manifest.ts`](placement-manifest.ts) | Envelope field placement manifest (sign-page + PDF) |
| [`deployment.ts`](deployment.ts) | `DEPLOYMENTS`, `DEPLOYMENT_CHAIN`, `billingEnabled`, `dodoLive`, `assertDeploymentChain` |
| [`draft-snapshot.ts`](draft-snapshot.ts) / [`draft-storage-keys.ts`](draft-storage-keys.ts) | Envelope draft persistence keys and snapshot digest |
| [`signer-email-commitment.ts`](signer-email-commitment.ts) | Email → on-chain commitment helpers |
| [`file-audit.ts`](file-audit.ts) | Audit event shapes for compliance |

## Conventions

- Prefer Zod v4 schemas; export `z.infer` types from schemas (no duplicate interfaces).
- Settlement rules are **multi-leg**; API list rows may expose legacy top-level fields from `legs[0]` for compat.
- Register routing advanced features require **`features.routing.advanced`** (Teams Pro+); enforced server-side.

## Tests

`packages/shared/tests/` — run via `bun run test -- --shared`.
