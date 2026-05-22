import { useManualSettlementPayout } from "./useManualSettlementPayout";

/** @deprecated Use `useTrySettleSettlement` (primary) or `useManualSettlementPayout` (fallback). */
export function useExecuteSettlementPayout(pieceCid: string | undefined) {
	return useManualSettlementPayout(pieceCid);
}
