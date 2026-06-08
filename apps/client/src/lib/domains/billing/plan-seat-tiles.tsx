import { getPlanName, zPlanId } from "@filosign/entitlements";
import { Badge } from "@/src/lib/components/ui/badge";

export function planDisplayName(planId: string): string {
	const parsed = zPlanId.safeParse(planId);
	return parsed.success ? getPlanName(parsed.data) : planId;
}

type PlanSeatTilesProps = {
	planId: string;
	planName?: string;
	usedSeats?: number;
	seatCount?: number;
	billingInterval?: "monthly" | "yearly" | null;
	periodEnd?: string | null;
	showSeatBar?: boolean;
};

export function PlanSeatTiles({
	planId,
	planName,
	usedSeats,
	seatCount,
	billingInterval,
	periodEnd,
	showSeatBar = true,
}: PlanSeatTilesProps) {
	const label = planName ?? planDisplayName(planId);
	const hasSeats =
		showSeatBar &&
		typeof usedSeats === "number" &&
		typeof seatCount === "number" &&
		seatCount > 0;

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<div className="flex min-h-24 flex-col justify-between rounded-xl border border-border bg-card p-4">
				<div>
					<span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
						Current plan
					</span>
					<div className="mt-1 flex items-center gap-2">
						<span className="text-lg font-medium text-foreground">{label}</span>
						<Badge variant="secondary">Active</Badge>
					</div>
				</div>
				{billingInterval && periodEnd ? (
					<p className="mt-3 text-xs text-muted-foreground">
						Billed {billingInterval === "yearly" ? "annually" : "monthly"}.
						Renews {new Date(periodEnd).toLocaleDateString()}.
					</p>
				) : null}
			</div>

			{hasSeats ? (
				<div className="flex min-h-24 flex-col justify-between rounded-xl border border-border bg-card p-4">
					<div>
						<span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
							Seats utilized
						</span>
						<p className="mt-1 text-lg font-medium text-foreground">
							{usedSeats} of {seatCount} seats
						</p>
					</div>
					<div className="mt-3">
						<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-secondary transition-all"
								style={{
									width: `${Math.min(
										100,
										Math.round((usedSeats / seatCount) * 100),
									)}%`,
								}}
							/>
						</div>
					</div>
				</div>
			) : (
				<div className="flex min-h-24 flex-col justify-center rounded-xl border border-border bg-card p-4">
					<span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
						Seats
					</span>
					<p className="mt-1 text-sm text-muted-foreground">
						Seat usage is managed by workspace admins in Billing.
					</p>
				</div>
			)}
		</div>
	);
}
