import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { planDisplayName } from "@/src/lib/domains/billing/plan-seat-tiles";

export function SubscriptionPaidControls(props: {
	isTeamsPaid: boolean;
	canUpgradeSoloToTeams: boolean;
	alternatePlanId: "teams" | "teams_pro" | null;
	allowed:
		| {
				canChangeOrgPlan?: boolean;
		  }
		| null
		| undefined;
	changePlanPending: boolean;
	planPreviewPending: boolean;
	openPlanPreview: (targetPlanId: "teams" | "teams_pro") => void;
	minSeats: number;
	committedSeats: number;
	seatCount: number;
	setSeatCount: (value: number | ((prev: number) => number)) => void;
	seatControlsDisabled: boolean;
	awaitingSeatSync: boolean;
	openSeatPreview: (next: number) => void;
	portalPending: boolean;
	openPortal: () => void;
}) {
	const {
		isTeamsPaid,
		canUpgradeSoloToTeams,
		alternatePlanId,
		allowed,
		changePlanPending,
		planPreviewPending,
		openPlanPreview,
		minSeats,
		committedSeats,
		seatCount,
		setSeatCount,
		seatControlsDisabled,
		awaitingSeatSync,
		openSeatPreview,
		portalPending,
		openPortal,
	} = props;

	return (
		<div className="space-y-4 border-t border-border/60 pt-6">
			{canUpgradeSoloToTeams ? (
				<div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/10 px-4 py-3">
					<p className="min-w-0 flex-1 text-pretty text-sm text-muted-foreground">
						Invite teammates and unlock collaboration features on Teams.
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={changePlanPending || planPreviewPending}
						onClick={() => void openPlanPreview("teams")}
					>
						Upgrade to Teams
					</Button>
				</div>
			) : null}
			{alternatePlanId && allowed?.canChangeOrgPlan ? (
				<div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/10 px-4 py-3">
					<p className="min-w-0 flex-1 text-pretty text-sm text-muted-foreground">
						Switch tiers anytime. Billing adjusts immediately; unused time is
						credited.
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={changePlanPending || planPreviewPending}
						onClick={() => void openPlanPreview(alternatePlanId)}
					>
						Switch to {planDisplayName(alternatePlanId)}
					</Button>
				</div>
			) : null}

			{isTeamsPaid ? (
				<div className="space-y-2">
					<Label htmlFor="ws-seat-count">Paid seats</Label>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="icon"
							className="size-9 rounded-lg touch-manipulation"
							disabled={committedSeats <= minSeats || seatControlsDisabled}
							aria-label="Remove one seat"
							onClick={() => void openSeatPreview(committedSeats - 1)}
						>
							<MinusIcon className="size-4" aria-hidden="true" />
						</Button>
						<Input
							id="ws-seat-count"
							type="number"
							name="seatCount"
							min={minSeats}
							autoComplete="off"
							spellCheck={false}
							className="h-9 w-24 rounded-lg tabular-nums"
							value={seatCount}
							disabled={seatControlsDisabled}
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
							disabled={seatControlsDisabled}
							aria-label="Add one seat"
							onClick={() => void openSeatPreview(committedSeats + 1)}
						>
							<PlusIcon className="size-4" aria-hidden="true" />
						</Button>
						{seatCount !== committedSeats ? (
							<Button
								type="button"
								variant="primary"
								className="h-9 touch-manipulation"
								disabled={seatControlsDisabled}
								onClick={() => void openSeatPreview(seatCount)}
							>
								{awaitingSeatSync ? "Syncing…" : "Apply seat count"}
							</Button>
						) : null}
					</div>
					<p className="text-pretty text-xs text-muted-foreground">
						Minimum {minSeats} seat{minSeats === 1 ? "" : "s"} (active members
						plus pending invites). Use +/− to change by one seat, then confirm
						the prorated charge or credit.
					</p>
				</div>
			) : null}

			<Button
				type="button"
				variant="outline"
				className="gap-2 touch-manipulation"
				disabled={portalPending}
				onClick={() => void openPortal()}
			>
				{portalPending ? "Opening…" : "Manage Subscription"}
			</Button>
		</div>
	);
}
