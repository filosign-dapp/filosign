import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";

export const BILLING_SYNC_COPY =
	"Billing changes usually take 1–2 minutes to show here and across the app. Manage Subscription may update on a different schedule.";

function formatUsdFromCents(cents: number, currency: string) {
	if (currency !== "USD") return `${(cents / 100).toFixed(2)} ${currency}`;
	return `$${(cents / 100).toFixed(2)}`;
}

export function BillingChangePreviewDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	preview: {
		isPending: boolean;
		data?:
			| {
					immediateChargeCents: number;
					currency: string;
					effectiveAt: string;
					isCredit: boolean;
					deltaSeatCount?: number;
			  }
			| undefined;
	};
	onConfirm: () => Promise<void>;
	isConfirming: boolean;
}) {
	const data = props.preview.data;
	const isCredit = data?.isCredit ?? false;
	const amountLabel = isCredit
		? "Credit on next invoice"
		: "Due today (prorated for added seats)";

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent className="overscroll-contain">
				<DialogHeader>
					<DialogTitle>{props.title}</DialogTitle>
					<DialogDescription>
						{props.preview.isPending
							? "Calculating prorated adjustment…"
							: props.description}
					</DialogDescription>
				</DialogHeader>
				{data ? (
					<div className="space-y-3">
						<div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
							<p className="font-medium text-foreground">{amountLabel}</p>
							<p className="mt-1 text-2xl tabular-nums">
								{formatUsdFromCents(
									Math.abs(data.immediateChargeCents),
									data.currency,
								)}
							</p>
							{isCredit ? (
								<p className="mt-2 text-xs text-muted-foreground">
									Unused time is credited to your next invoice, not refunded as
									cash.
								</p>
							) : (
								<p className="mt-2 text-xs text-muted-foreground">
									We charge your saved payment method. No checkout redirect.
								</p>
							)}
							<p className="mt-2 text-xs text-muted-foreground">
								Effective {new Date(data.effectiveAt).toLocaleString()}
							</p>
						</div>
						<p className="text-xs text-pretty text-muted-foreground">
							After you confirm, {BILLING_SYNC_COPY.toLowerCase()}
						</p>
					</div>
				) : null}
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => props.onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="primary"
						disabled={!data || props.isConfirming || props.preview.isPending}
						onClick={() => void props.onConfirm()}
					>
						{props.isConfirming ? "Submitting…" : "Confirm change"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
