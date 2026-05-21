# `@filosign/gelato`

Gelato Web3 Functions for Filosign USDC payouts. Filosign does not relay payout transactions; Gelato executes `FSPaymentValidator.executePayout` when release conditions are met.

## Functions

### `payout-web3-function` (event trigger)

Export: `@filosign/gelato/payout`

- Trigger: `FileSigned` on `FSFileRegistry`
- Loads `ruleIdsForCid`, checks `canExecute`, returns calldata for `executePayout`
- `onSuccess` / `onFail` POST to Filosign with `onChainRuleId` from Gelato storage

### `payout-redrive-cron` (time trigger)

Export: `@filosign/gelato/payout-redrive`

- Trigger: Gelato cron (recommended hourly)
- `GET` Filosign pending rules (`status: ready`), retries `canExecute` + `executePayout`
- Same webhook callbacks as the event function

Shared helpers live in `src/lib/webhook.ts` and `src/lib/validator-abi.ts`.

## Deploy

1. Deploy contracts so `definitions/` includes `FSPaymentValidator` (`bun run contracts -- --migrate`).
2. Create tasks in [Gelato dashboard](https://app.gelato.cloud) or Automate SDK.
3. Fund **1Balance** Gas Tank for the chain.

### User args (both functions)

| Arg | Description |
| --- | ----------- |
| `validatorAddress` | `FSPaymentValidator` from chain definitions |
| `registryAddress` | `FSFileRegistry` address |
| `filosignWebhookUrl` | `https://<api>/api/integrations/gelato/payout` |
| `filosignWebhookSecret` | Same value as server `GELATO_WEBHOOK_SECRET` |

**Redrive cron only:**

| Arg | Description |
| --- | ----------- |
| `filosignPendingRulesUrl` | `https://<api>/api/integrations/gelato/pending-rules` |

## Server integration

| Route | Method | Auth |
| ----- | ------ | ---- |
| `/api/integrations/gelato/payout` | POST | `X-Gelato-Webhook-Secret` |
| `/api/integrations/gelato/pending-rules` | GET | `X-Gelato-Webhook-Secret` |

Hourly Bun cron (`sync-payment-rules`) sets DB status `ready` when `canExecute` is true on-chain.

## Local test

```bash
cd packages/gelato
bunx w3f test src/payout-web3-function/index.ts --logs
bunx w3f test src/payout-web3-function/index.ts --logs --onSuccess
bunx w3f test src/payout-web3-function/index.ts --logs --onFail
```

## Package scripts

```bash
bun run --cwd packages/gelato check-types
```
