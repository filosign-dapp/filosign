# Web code quality audit — May 2026 (settlement vertical)

Baseline: `bun run check` green; server **108** tests pass; contracts 78 tests pass.

## Remediation status

| Phase | Status |
|-------|--------|
| Platform-access split | Done — `platform-access-{gates,grants,registration,invites,requests}.ts` + `utils/shared.ts` |
| Files cold-invite / piece / register | Done — domain `cold-invite.ts`; `piece-{ack,views,draft,download}.ts`; `utils/register-{routing,persist,notify}.ts` |
| EVM relays + barrels | Done — `relayRegisterFileSignature` / `relayAmendSigner` in `evm.ts`; `ORPCError` in `settlement-db-sync`; settlement-access + entitlements `index` exports |
| SDK settlement hooks | Done — `useSettlementFeatureAccessGet`, `useSubmitSettlementFeatureAccessRequest`, `useAttachSettlementForFile` |
| Client thin UI | Done — `usePayoutFeatureAccess`, `useSignSettlementsActions`, `settlement-legs` util, `safeAsync` + toast in sign actions; `useSignFile` invalidates piece detail |
| Domain tests | Done — settlement-access admin/submit, recipient-ack, register gates, verify-rules payers, SDK hook smoke |

## Original findings (severity)

- **High:** `platform-access.ts` god file — **addressed**
- **High:** `files/piece.ts`, `register.ts`, cold-invite handler — **addressed**
- **High:** Client `rpc` in payout settings / attach flow — **addressed** (workspace payout section; attach via SDK hook)
- **Medium:** EVM `as unknown as` writes, `ORPCError` in settlement-db-sync — **addressed**
- **Deferred:** `useSendFile` decomposition, full admin page split, `draft-actions` `rpc.drafts.get` (envelope scope)
