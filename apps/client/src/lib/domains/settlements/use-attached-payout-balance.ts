import { useMemo } from "react";
import { SUPPORTED_TOKENS } from "@/src/constants";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements/attachment-draft";
import {
	settlementPayoutExceedsBalance,
	sumSettlementDraftsUsdc,
} from "@/src/lib/domains/settlements/payout-totals";
import { formatUsdcAmount } from "@/src/lib/web3/format-usdc";
import { useWalletUsdcBalance } from "@/src/lib/web3/use-wallet-usdc-balance";

const usdcToken = SUPPORTED_TOKENS[0];

export function useAttachedPayoutBalance(
	settlementDrafts: SettlementAttachmentDraft[] | undefined,
) {
	const drafts = settlementDrafts ?? [];
	const {
		address,
		balance,
		formatted: formattedBalance,
		isPending: balancePending,
		isError: balanceError,
	} = useWalletUsdcBalance();

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
		walletAddress: address,
		walletBalance: balance,
		formattedBalance,
		balancePending,
		balanceError,
		exceedsBalance,
	};
}
