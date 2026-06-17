import { SUPPORTED_TOKENS } from "@/src/constants";
import { Image } from "@/src/lib/components/app/media/image";
import { PAYOUT_EXCEEDS_BALANCE_MESSAGE } from "@/src/lib/domains/settlements";
import { cn } from "@/src/lib/utils/utils";

const usdcToken = SUPPORTED_TOKENS[0];

type Props = {
	formattedTotal: string;
	formattedBalance: string;
	balancePending: boolean;
	balanceError: boolean;
	walletConnected: boolean;
	exceedsBalance: boolean;
	payerLabel?: "treasury" | "wallet";
};

export function PayoutBalanceSummary({
	formattedTotal,
	formattedBalance,
	balancePending,
	balanceError,
	walletConnected,
	exceedsBalance,
	payerLabel = "wallet",
}: Props) {
	return (
		<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border-t mt-4 border-border/50 bg-background/50 px-3 py-2.5 text-sm">
			<div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
				{balancePending ? (
					<span>Loading balance…</span>
				) : !walletConnected ? (
					<span>Connect wallet to see balance</span>
				) : balanceError ? (
					<span>Balance unavailable</span>
				) : (
					<>
						<span>
							Available{payerLabel === "treasury" ? " (treasury)" : ""}
						</span>
						<Image
							src={usdcToken.icon}
							alt=""
							width={12}
							height={12}
							className="size-3 rounded-full"
						/>
						<span>{formattedBalance} USDC</span>
					</>
				)}
			</div>
			{exceedsBalance ? (
				<p className="w-full text-xs text-destructive">
					{PAYOUT_EXCEEDS_BALANCE_MESSAGE}
				</p>
			) : null}

			<div className="inline-flex items-center gap-1.5 mt-2 tabular-nums">
				<span className="text-muted-foreground">Total attached</span>
				<Image
					src={usdcToken.icon}
					alt=""
					width={14}
					height={14}
					className="size-3.5 rounded-full"
				/>
				<span
					className={cn("font-medium", exceedsBalance && "text-destructive")}
				>
					{formattedTotal} USDC
				</span>
			</div>
		</div>
	);
}
