import { useMemo } from "react";
import { SUPPORTED_TOKENS } from "@/src/constants";
import { formatUsdcAmount } from "@/src/lib/web3/format-usdc";
import type { SettlementAttachmentDraft } from "../utils/attachment-draft";
import {
	settlementPayoutExceedsBalance,
	sumSettlementDraftsUsdc,
} from "../utils/payout-totals";
import { usePayoutPayerBalance } from "./use-payout-payer-balance";

const usdcToken = SUPPORTED_TOKENS[0];

export function useAttachedPayoutBalance(
	settlementDrafts: SettlementAttachmentDraft[] | undefined,
	payoutPayerSource: "sender" | "org_wallet" | undefined,
) {
	const drafts = settlementDrafts ?? [];
	const {
		payerAddress: address,
		payerLabel,
		balance,
		formatted: formattedBalance,
		isPending: balancePending,
		isError: balanceError,
	} = usePayoutPayerBalance(payoutPayerSource);

	const totalWei = useMemo(() => sumSettlementDraftsUsdc(drafts), [drafts]);
	const hasPayouts = totalWei > 0n;
	const formattedTotal = formatUsdcAmount(totalWei, usdcToken.decimals);
	const exceedsBalance = settlementPayoutExceedsBalance({
		drafts,
		walletAddress: address,
		walletBalance: balance,
	});

	return {
		hasPayouts,
		totalWei,
		formattedTotal,
		payerLabel,
		walletAddress: address,
		walletBalance: balance,
		formattedBalance,
		balancePending,
		balanceError,
		exceedsBalance,
	};
}
