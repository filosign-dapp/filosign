import { ArrowSquareOutIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { planDisplayName } from "@/src/lib/domains/billing/plan-seat-tiles";
import { cn } from "@/src/lib/utils/index";

type BillingInterval = "monthly" | "yearly";
type OrgPlanId = "individual" | "teams" | "teams_pro";

export function SubscriptionCheckoutForm(props: {
	allowed:
		| {
				canCheckoutSolo?: boolean;
				showSoloOnWorkspace?: boolean;
				canCheckoutTeams?: boolean;
		  }
		| null
		| undefined;
	planId: OrgPlanId;
	setPlanId: (planId: OrgPlanId) => void;
	interval: BillingInterval;
	setInterval: (interval: BillingInterval) => void;
	minSeats: number;
	seatCount: number;
	setSeatCount: (value: number | ((prev: number) => number)) => void;
	pricePerSeat: number;
	totalPrice: number;
	totalYearlyPrice: number;
	hasPaidPlan: boolean;
	checkoutPending: boolean;
	startCheckout: () => void;
}) {
	const {
		allowed,
		planId,
		setPlanId,
		interval,
		setInterval,
		minSeats,
		seatCount,
		setSeatCount,
		pricePerSeat,
		totalPrice,
		totalYearlyPrice,
		hasPaidPlan,
		checkoutPending,
		startCheckout,
	} = props;

	const planOptions = [
		...(allowed?.canCheckoutSolo || allowed?.showSoloOnWorkspace
			? (["individual"] as const)
			: []),
		...(allowed?.canCheckoutTeams ? (["teams", "teams_pro"] as const) : []),
	] as OrgPlanId[];

	return (
		<div className="space-y-6 border-t border-border/60 pt-6">
			<div className="flex items-center gap-2">
				<ArrowSquareOutIcon
					className="size-4 text-primary"
					aria-hidden="true"
				/>
				<h3 className="text-sm font-medium text-foreground">
					Select an upgrade path
				</h3>
			</div>

			<div className="space-y-4">
				<div className="space-y-2">
					<Label>Subscription Plan</Label>
					<div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
						{planOptions.map((id) => (
							<button
								key={id}
								type="button"
								className={cn(
									"flex cursor-pointer flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all hover:bg-muted/5",
									planId === id
										? "border-primary bg-primary/5 ring-1 ring-primary"
										: "border-border/60 bg-card",
								)}
								onClick={() => setPlanId(id)}
							>
								<span className="text-sm font-semibold text-foreground">
									{planDisplayName(id)}
								</span>
								<span className="text-xs leading-relaxed text-muted-foreground">
									{id === "individual"
										? "One seat for personal workflows and higher document limits."
										: id === "teams"
											? "Collaborate with your team, share templates, and team visibility."
											: "Advanced routing, advanced settlements, and integrations."}
								</span>
							</button>
						))}
					</div>
				</div>

				<div className="space-y-2">
					<Label>Billing Interval</Label>
					<div className="grid max-w-xs grid-cols-2 gap-1 rounded-lg bg-muted/40 p-1">
						{(["monthly", "yearly"] as const).map((value) => (
							<button
								key={value}
								type="button"
								className={cn(
									"relative flex cursor-pointer items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium capitalize transition-all",
									interval === value
										? "bg-background text-foreground shadow-xs"
										: "text-muted-foreground hover:text-foreground",
								)}
								onClick={() => setInterval(value)}
							>
								<span>{value}</span>
								{value === "yearly" ? (
									<Badge
										variant="secondary"
										className="h-4 px-1 py-0 text-[9px] font-bold tracking-wider uppercase"
									>
										SAVE 15%
									</Badge>
								) : null}
							</button>
						))}
					</div>
				</div>

				{planId !== "individual" ? (
					<div className="space-y-3">
						<Label htmlFor="ws-checkout-seats">Seats to purchase</Label>
						<div className="flex flex-wrap items-center gap-4">
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="size-9 rounded-lg touch-manipulation"
									disabled={seatCount <= minSeats}
									aria-label="Remove one seat"
									onClick={() => setSeatCount((s) => Math.max(minSeats, s - 1))}
								>
									<MinusIcon className="size-4" aria-hidden="true" />
								</Button>
								<Input
									id="ws-checkout-seats"
									type="number"
									name="checkoutSeatCount"
									min={minSeats}
									autoComplete="off"
									spellCheck={false}
									className="h-9 w-20 rounded-lg text-center tabular-nums"
									value={seatCount}
									onChange={(e) =>
										setSeatCount(
											Math.max(
												minSeats,
												Number.parseInt(e.target.value, 10) || minSeats,
											),
										)
									}
								/>
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="size-9 rounded-lg touch-manipulation"
									aria-label="Add one seat"
									onClick={() => setSeatCount((s) => s + 1)}
								>
									<PlusIcon className="size-4" aria-hidden="true" />
								</Button>
							</div>

							<div className="flex items-baseline gap-1.5">
								<span className="text-sm text-muted-foreground">
									x ${pricePerSeat}/mo
								</span>
								<span className="text-base font-semibold text-foreground">
									Total: ${totalPrice}/mo
								</span>
								{interval === "yearly" ? (
									<span className="text-xs font-normal text-muted-foreground">
										(billed ${totalYearlyPrice}/yr)
									</span>
								) : null}
							</div>
						</div>
						<p className="text-xs text-muted-foreground">
							Minimum {minSeats} seat{minSeats === 1 ? "" : "s"} required based
							on current members and invites.
						</p>
					</div>
				) : (
					<p className="text-xs text-muted-foreground">
						Solo includes one seat on this workspace.
					</p>
				)}
			</div>

			<div className="flex justify-end border-t border-border/60 pt-4">
				<Button
					type="button"
					variant="secondary"
					disabled={checkoutPending || hasPaidPlan}
					onClick={() => void startCheckout()}
				>
					<span>
						{checkoutPending ? "Preparing checkout…" : "Continue to checkout"}
					</span>
					<span className="font-sans">→</span>
				</Button>
			</div>
		</div>
	);
}
