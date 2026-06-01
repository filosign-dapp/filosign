import { getPlanPrice, getPlanYearlyTotal } from "@filosign/entitlements";
import {
	useChangeOrgPlan,
	useCreateOrgCheckoutSession,
	useCreateOrgPortalSession,
	useOrgBillingSummary,
	usePreviewOrgPlanChange,
	usePreviewOrgSeatChange,
	useUpdateOrgSeats,
	useWorkspaceBillingContext,
} from "@filosign/react/billing";
import {
	ArrowSquareOutIcon,
	CreditCardIcon,
	MinusIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { cn } from "@/src/lib/utils/index";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import { WorkspaceSection, WorkspaceSyncNotice } from "./workspace-section";

type BillingInterval = "monthly" | "yearly";
type OrgPlanId = "individual" | "teams" | "teams_pro";

const BILLING_SYNC_COPY =
	"Billing changes usually take 1–2 minutes to show here and across the app. Manage Subscription may update on a different schedule.";

function formatUsdFromCents(cents: number, currency: string) {
	if (currency !== "USD") return `${(cents / 100).toFixed(2)} ${currency}`;
	return `$${(cents / 100).toFixed(2)}`;
}

function orgPlanLabel(planId: string) {
	switch (planId) {
		case "individual":
			return "Solo";
		case "teams_pro":
			return "Teams Pro";
		case "teams":
			return "Teams";
		default:
			return planId;
	}
}

function BillingChangePreviewDialog(props: {
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

export function BillingSection() {
	const { activeMembership } = useWorkspaceSettings();
	const summary = useOrgBillingSummary();
	const billingContext = useWorkspaceBillingContext();
	const checkout = useCreateOrgCheckoutSession();
	const updateSeats = useUpdateOrgSeats();
	const changePlan = useChangeOrgPlan();
	const portal = useCreateOrgPortalSession();

	const canManage =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";

	const [planId, setPlanId] = useState<OrgPlanId>("teams");
	const [interval, setInterval] = useState<BillingInterval>("monthly");
	const [seatCount, setSeatCount] = useState(1);
	const [seatPreviewOpen, setSeatPreviewOpen] = useState(false);
	const [planPreviewOpen, setPlanPreviewOpen] = useState(false);
	const [pendingSeatCount, setPendingSeatCount] = useState(1);
	const [pendingPlanId, setPendingPlanId] = useState<"teams" | "teams_pro">(
		"teams",
	);
	const [awaitingSeatSync, setAwaitingSeatSync] = useState(false);
	const [awaitingPlanSync, setAwaitingPlanSync] = useState(false);
	const syncedSeatCountRef = useRef<number | undefined>(undefined);
	const seatPreview = usePreviewOrgSeatChange();
	const planPreview = usePreviewOrgPlanChange();

	const data = summary.data;
	const minSeats = Math.max(1, data?.usedSeats ?? 1);
	const committedSeats = Math.max(data?.seatCount ?? seatCount, minSeats);
	const isSolo = data?.planId === "individual";
	const isTeamsPaid = data?.planId === "teams" || data?.planId === "teams_pro";
	const hasPaidPlan = isSolo || isTeamsPaid;

	const pricePerSeat = useMemo(() => {
		return getPlanPrice(planId, interval);
	}, [planId, interval]);

	const totalPrice = useMemo(() => {
		return pricePerSeat * seatCount;
	}, [pricePerSeat, seatCount]);

	const totalYearlyPrice = useMemo(() => {
		return getPlanYearlyTotal(planId) * seatCount;
	}, [planId, seatCount]);

	const billingSyncPending = awaitingSeatSync || awaitingPlanSync;
	const seatControlsDisabled =
		updateSeats.isPending ||
		seatPreview.isPending ||
		seatPreviewOpen ||
		awaitingSeatSync;

	useEffect(() => {
		if (!data) return;
		if (awaitingSeatSync) {
			if (data.seatCount === pendingSeatCount) {
				setAwaitingSeatSync(false);
				syncedSeatCountRef.current = data.seatCount;
				setSeatCount(pendingSeatCount);
			}
			return;
		}
		const next = Math.max(data.seatCount, data.usedSeats);
		if (syncedSeatCountRef.current !== data.seatCount) {
			syncedSeatCountRef.current = data.seatCount;
			setSeatCount(next);
		}
	}, [
		data?.seatCount,
		data?.usedSeats,
		awaitingSeatSync,
		pendingSeatCount,
		data,
	]);

	useEffect(() => {
		if (!awaitingPlanSync || !data) return;
		if (data.planId === pendingPlanId) {
			setAwaitingPlanSync(false);
		}
	}, [awaitingPlanSync, data?.planId, pendingPlanId, data]);

	useEffect(() => {
		if (!billingSyncPending) return;
		const pollId = window.setInterval(() => {
			void summary.refetch();
		}, 5000);
		const timeoutId = window.setTimeout(() => {
			setAwaitingSeatSync(false);
			setAwaitingPlanSync(false);
		}, 180_000);
		return () => {
			window.clearInterval(pollId);
			window.clearTimeout(timeoutId);
		};
	}, [billingSyncPending, summary.refetch]);

	if (!canManage) return null;

	const returnUrl = `${window.location.origin}/dashboard/settings/workspace`;

	const startCheckout = async () => {
		try {
			const checkoutSeats =
				planId === "individual" ? 1 : Math.max(seatCount, minSeats);
			const result = await checkout.mutateAsync({
				planId,
				interval,
				seatCount: checkoutSeats,
				returnUrl,
			});
			window.location.href = result.checkoutUrl;
		} catch {}
	};

	const openSeatPreview = async (next: number) => {
		const target = Math.max(next, minSeats);
		if (data && target === committedSeats) return;
		setPendingSeatCount(target);
		try {
			await seatPreview.mutateAsync(target);
			setSeatPreviewOpen(true);
		} catch {}
	};

	const confirmSeatChange = async () => {
		try {
			const result = await updateSeats.mutateAsync(pendingSeatCount);
			setSeatPreviewOpen(false);
			syncedSeatCountRef.current = result.seatCount;
			setSeatCount(result.seatCount);
			if (result.pendingPayment) {
				toast.error(
					"Payment did not go through. Update your payment method in Manage Subscription, then try again.",
				);
				return;
			}
			if (!result.changed) {
				toast.info(`This workspace is already on ${result.seatCount} seats.`);
				return;
			}
			setAwaitingSeatSync(true);
			toast.success(
				"Seat change submitted. Your dashboard should update within 1–2 minutes.",
			);
		} catch {}
	};

	const allowed = billingContext.data?.allowedActions;
	const alternatePlanId: "teams" | "teams_pro" | null =
		allowed?.alternateOrgPlanId ?? null;
	const canUpgradeSoloToTeams =
		isSolo && Boolean(allowed?.canChangeOrgPlan && data?.hasDodoSubscription);

	const openPlanPreview = async (targetPlanId: "teams" | "teams_pro") => {
		setPendingPlanId(targetPlanId);
		try {
			await planPreview.mutateAsync(targetPlanId);
			setPlanPreviewOpen(true);
		} catch {}
	};

	const confirmPlanChange = async () => {
		try {
			const result = await changePlan.mutateAsync(pendingPlanId);
			setPlanPreviewOpen(false);
			if (!result.changed) return;
			setAwaitingPlanSync(true);
			toast.success(
				"Plan change submitted. Your dashboard should update within 1–2 minutes.",
			);
		} catch {}
	};

	const openPortal = async () => {
		try {
			const result = await portal.mutateAsync();
			window.open(result.url, "_blank", "noopener,noreferrer");
		} catch {}
	};

	return (
		<WorkspaceSection
			icon={<CreditCardIcon className="size-4" aria-hidden="true" />}
			title="Billing & Plans"
			description="Manage your subscription, renewal cycle, and seat count."
		>
			{summary.isLoading ? (
				<p className="text-sm text-muted-foreground">Loading billing…</p>
			) : data ? (
				<div className="space-y-6">
					{billingSyncPending ? (
						<WorkspaceSyncNotice
							title="Update in progress"
							body={BILLING_SYNC_COPY}
						/>
					) : null}

					<div className="grid gap-4 sm:grid-cols-2">
						{/* Current Plan Card */}
						<div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between min-h-[110px]">
							<div>
								<span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
									Current Plan
								</span>
								<div className="mt-1 flex items-center gap-2">
									<span className="text-lg font-medium text-foreground">
										{orgPlanLabel(data.planId)}
									</span>
									<Badge variant="secondary">Active</Badge>
								</div>
							</div>
							{data.billingInterval && data.periodEnd ? (
								<p className="mt-3 text-xs text-muted-foreground">
									Billed{" "}
									{data.billingInterval === "yearly" ? "annually" : "monthly"}.
									Renews {new Date(data.periodEnd).toLocaleDateString()}.
								</p>
							) : null}
						</div>

						{/* Seats Utilized Card */}
						<div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between min-h-[110px]">
							<div>
								<span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
									Seats Utilized
								</span>
								<p className="mt-1 text-lg font-medium text-foreground">
									{awaitingSeatSync
										? "Syncing…"
										: `${data.usedSeats} of ${data.seatCount} seats`}
								</p>
							</div>
							<div className="mt-3">
								<div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
									<div
										className="h-full bg-secondary rounded-full transition-all"
										style={{
											width: `${Math.min(
												100,
												Math.round((data.usedSeats / data.seatCount) * 100),
											)}%`,
										}}
									/>
								</div>
							</div>
						</div>
					</div>

					{data.cancelAtPeriodEnd && data.periodEnd ? (
						<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
							Cancels at end of period (
							{new Date(data.periodEnd).toLocaleDateString()}). Paid features
							stay available until then.
						</div>
					) : null}

					{data.hasDodoSubscription ? (
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
										disabled={changePlan.isPending || planPreview.isPending}
										onClick={() => void openPlanPreview("teams")}
									>
										Upgrade to Teams
									</Button>
								</div>
							) : null}
							{alternatePlanId && allowed?.canChangeOrgPlan ? (
								<div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/10 px-4 py-3">
									<p className="min-w-0 flex-1 text-pretty text-sm text-muted-foreground">
										Switch tiers anytime. Billing adjusts immediately; unused
										time is credited.
									</p>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={changePlan.isPending || planPreview.isPending}
										onClick={() => void openPlanPreview(alternatePlanId)}
									>
										Switch to {orgPlanLabel(alternatePlanId)}
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
											disabled={
												committedSeats <= minSeats || seatControlsDisabled
											}
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
											className="w-24 rounded-lg tabular-nums h-9"
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
										Minimum {minSeats} seat{minSeats === 1 ? "" : "s"} (active
										members plus pending invites). Use +/− to change by one
										seat, then confirm the prorated charge or credit.
									</p>
								</div>
							) : null}

							<Button
								type="button"
								variant="outline"
								className="gap-2 touch-manipulation"
								disabled={portal.isPending}
								onClick={() => void openPortal()}
							>
								{portal.isPending ? "Opening…" : "Manage Subscription"}
							</Button>
						</div>
					) : (
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
								{/* Plan Toggles */}
								<div className="space-y-2">
									<Label>Subscription Plan</Label>
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-xl">
										{(
											[
												...(allowed?.canCheckoutSolo ||
												allowed?.showSoloOnWorkspace
													? (["individual"] as const)
													: []),
												...(allowed?.canCheckoutTeams
													? (["teams", "teams_pro"] as const)
													: []),
											] as OrgPlanId[]
										).map((id) => (
											<button
												key={id}
												type="button"
												className={cn(
													"flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all hover:bg-muted/5 cursor-pointer",
													planId === id
														? "border-primary bg-primary/5 ring-1 ring-primary"
														: "border-border/60 bg-card",
												)}
												onClick={() => setPlanId(id)}
											>
												<span className="text-sm font-semibold text-foreground">
													{orgPlanLabel(id)}
												</span>
												<span className="text-xs text-muted-foreground leading-relaxed">
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

								{/* Interval Toggles */}
								<div className="space-y-2">
									<Label>Billing Interval</Label>
									<div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/40 p-1 max-w-xs">
										{(["monthly", "yearly"] as const).map((value) => (
											<button
												key={value}
												type="button"
												className={cn(
													"relative flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium capitalize transition-all cursor-pointer",
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
														className="text-[9px] px-1 py-0 h-4 uppercase font-bold tracking-wider"
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
													onClick={() =>
														setSeatCount((s) => Math.max(minSeats, s - 1))
													}
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
													className="w-20 rounded-lg text-center tabular-nums h-9"
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
													<span className="text-xs text-muted-foreground font-normal">
														(billed ${totalYearlyPrice}/yr)
													</span>
												) : null}
											</div>
										</div>
										<p className="text-xs text-muted-foreground">
											Minimum {minSeats} seat{minSeats === 1 ? "" : "s"}{" "}
											required based on current members and invites.
										</p>
									</div>
								) : (
									<p className="text-xs text-muted-foreground">
										Solo includes one seat on this workspace.
									</p>
								)}
							</div>

							{/* Checkout Action Button */}
							<div className="flex justify-end pt-4 border-t border-border/60">
								<Button
									type="button"
									variant="secondary"
									disabled={checkout.isPending || hasPaidPlan}
									onClick={() => void startCheckout()}
								>
									<span>
										{checkout.isPending
											? "Preparing checkout…"
											: "Continue to checkout"}
									</span>
									<span className="font-sans">→</span>
								</Button>
							</div>
						</div>
					)}
				</div>
			) : null}

			<BillingChangePreviewDialog
				open={seatPreviewOpen}
				onOpenChange={setSeatPreviewOpen}
				title="Confirm seat change"
				description={
					seatPreview.data
						? `Change from ${seatPreview.data.currentSeatCount} to ${seatPreview.data.seatCount} seats.`
						: "Preview unavailable"
				}
				preview={seatPreview}
				onConfirm={confirmSeatChange}
				isConfirming={updateSeats.isPending}
			/>
			<BillingChangePreviewDialog
				open={planPreviewOpen}
				onOpenChange={setPlanPreviewOpen}
				title="Confirm plan change"
				description={
					planPreview.data
						? `Switch from ${orgPlanLabel(planPreview.data.currentPlanId ?? data?.planId ?? "teams")} to ${orgPlanLabel(planPreview.data.planId ?? pendingPlanId)}.`
						: "Preview unavailable"
				}
				preview={planPreview}
				onConfirm={confirmPlanChange}
				isConfirming={changePlan.isPending}
			/>
		</WorkspaceSection>
	);
}
