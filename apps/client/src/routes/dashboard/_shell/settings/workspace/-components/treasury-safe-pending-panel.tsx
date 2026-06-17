import { safeAppUrlForChainId } from "@filosign/shared";
import type { Address } from "viem";
import { treasuryChainId } from "@/src/lib/web3/treasury";

type TreasurySafePendingPanelProps = {
	safeAddress?: Address;
	message?: string;
};

export function TreasurySafePendingPanel({
	safeAddress,
	message = "Waiting for treasury Safe signatures. Open your Safe app to confirm, then return here.",
}: TreasurySafePendingPanelProps) {
	const queueUrl =
		safeAddress != null
			? safeAppUrlForChainId(treasuryChainId(), safeAddress)
			: null;

	return (
		<div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
			<p className="font-medium text-foreground">Treasury Safe pending</p>
			<p className="mt-1 text-muted-foreground">{message}</p>
			{queueUrl ? (
				<p className="mt-2">
					<a
						href={queueUrl}
						target="_blank"
						rel="noreferrer"
						className="text-primary underline-offset-4 hover:underline"
					>
						Open Safe queue
					</a>
				</p>
			) : null}
		</div>
	);
}
