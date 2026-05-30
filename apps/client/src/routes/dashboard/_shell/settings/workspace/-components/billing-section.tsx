import {
	useChangeOrgPlan,
	useCreateOrgCheckoutSession,
	useCreateOrgPortalSession,
	useOrgBillingSummary,
	usePreviewOrgPlanChange,
	usePreviewOrgSeatChange,
	useUpdateOrgSeats,
} from "@filosign/react/billing";
import { CreditCardIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { billingUiEnabled } from "@/src/lib/deployment";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";

type BillingInterval = "monthly" | "yearly";
type OrgPlanId = "teams" | "teams_pro";

function formatUsdFromCents(cents: number, currency: string) {
	if (currency !== "USD") return `${(cents / 100).toFixed(2)} ${currency}`;
	return `$${(cents / 100).toFixed(2)}`;
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
			  }
			| undefined;
	};
	onConfirm: () => Promise<void>;
	isConfirming: boolean;
}) {
	const data = props.preview.data;

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{props.title}</DialogTitle>
					<DialogDescription>
						{props.preview.isPending
							? "Calculating prorated charge…"
							: props.description}
					</DialogDescription>
				</DialogHeader>
				{data ? (
					<div className="rounded-md border border-border bg-muted/20 p-4 text-sm">
						<p className="font-medium text-foreground">Due today (prorated)</p>
						<p className="mt-1 text-2xl tabular-nums">
							{formatUsdFromCents(data.immediateChargeCents, data.currency)}
						</p>
						<p className="mt-2 text-xs text-muted-foreground">
							Effective {new Date(data.effectiveAt).toLocaleString()}
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
						{props.isConfirming ? "Updating…" : "Confirm change"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function BillingSection() {
	const { activeMembership } = useWorkspaceSettings();
	const summary = useOrgBillingSummary();
	const checkout = useCreateOrgCheckoutSession();
	const updateSeats = useUpdateOrgSeats();
	const changePlan = useChangeOrgPlan();
	const portal = useCreateOrgPortalSession();

	const canManage =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";
	const billingEnabled = billingUiEnabled();

	const [planId, setPlanId] = useState<OrgPlanId>("teams");
	const [interval, setInterval] = useState<BillingInterval>("monthly");
	const [seatCount, setSeatCount] = useState(1);
	const [seatPreviewOpen, setSeatPreviewOpen] = useState(false);
	const [planPreviewOpen, setPlanPreviewOpen] = useState(false);
	const [pendingSeatCount, setPendingSeatCount] = useState(1);
	const [pendingPlanId, setPendingPlanId] = useState<OrgPlanId>("teams");
	const seatPreview = usePreviewOrgSeatChange();
	const planPreview = usePreviewOrgPlanChange();

	const data = summary.data;
	const minSeats = Math.max(1, data?.usedSeats ?? 1);
	const hasPaidPlan = data?.planId === "teams" || data?.planId === "teams_pro";

	useEffect(() => {
		if (!data) return;
		setSeatCount(Math.max(data.seatCount, data.usedSeats));
	}, [data?.seatCount, data?.usedSeats]);

	const seatUsageLabel = useMemo(() => {
		if (!data) return "";
		return `${data.usedSeats} of ${data.seatCount} seats in use`;
	}, [data]);

	if (!canManage || !billingEnabled) return null;

	const returnUrl = `${window.location.origin}/dashboard/settings/workspace`;

	const startCheckout = async () => {
		try {
			const result = await checkout.mutateAsync({
				planId,
				interval,
				seatCount: Math.max(seatCount, minSeats),
				returnUrl,
			});
			window.location.href = result.checkoutUrl;
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to start checkout",
			);
		}
	};

	const openSeatPreview = async (next: number) => {
		const target = Math.max(next, minSeats);
		setPendingSeatCount(target);
		try {
			await seatPreview.mutateAsync(target);
			setSeatPreviewOpen(true);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Could not preview seat change",
			);
		}
	};

	const confirmSeatChange = async () => {
		try {
			await updateSeats.mutateAsync(pendingSeatCount);
			toast.success("Workspace seats updated");
			setSeatPreviewOpen(false);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to update seats",
			);
		}
	};

	const alternatePlanId: OrgPlanId | null =
		data?.planId === "teams"
			? "teams_pro"
			: data?.planId === "teams_pro"
				? "teams"
				: null;

	const openPlanPreview = async (targetPlanId: OrgPlanId) => {
		setPendingPlanId(targetPlanId);
		try {
			await planPreview.mutateAsync(targetPlanId);
			setPlanPreviewOpen(true);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Could not preview plan change",
			);
		}
	};

	const confirmPlanChange = async () => {
		try {
			await changePlan.mutateAsync(pendingPlanId);
			toast.success("Workspace plan updated");
			setPlanPreviewOpen(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to change plan");
		}
	};

	const openPortal = async () => {
		try {
			const result = await portal.mutateAsync();
			window.open(result.url, "_blank", "noopener,noreferrer");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to open billing portal",
			);
		}
	};

	return (
		<section className="space-y-4 rounded-lg border border-border p-6 bg-card/30">
			<div className="flex items-center gap-2">
				<CreditCardIcon className="size-5 text-muted-foreground" />
				<h2 className="text-sm font-semibold text-foreground">Billing</h2>
			</div>

			{summary.isLoading ? (
				<p className="text-sm text-muted-foreground">Loading billing…</p>
			) : data ? (
				<div className="space-y-6">
					<div className="grid gap-2 text-sm sm:grid-cols-2">
						<div>
							<p className="text-muted-foreground">Plan</p>
							<p className="font-medium capitalize">{data.planId}</p>
						</div>
						<div>
							<p className="text-muted-foreground">Seats</p>
							<p className="font-medium">{seatUsageLabel}</p>
						</div>
						{data.billingInterval ? (
							<div>
								<p className="text-muted-foreground">Billing</p>
								<p className="font-medium capitalize">{data.billingInterval}</p>
							</div>
						) : null}
						{data.periodEnd ? (
							<div>
								<p className="text-muted-foreground">Renews</p>
								<p className="font-medium">
									{new Date(data.periodEnd).toLocaleDateString()}
								</p>
							</div>
						) : null}
						{data.cancelAtPeriodEnd && data.periodEnd ? (
							<div className="sm:col-span-2">
								<p className="text-xs text-amber-600 dark:text-amber-400">
									Cancels at end of period (
									{new Date(data.periodEnd).toLocaleDateString()}). Paid
									features remain until then.
								</p>
							</div>
						) : null}
					</div>

					{data.hasDodoSubscription ? (
						<div className="space-y-3">
							{alternatePlanId ? (
								<div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
									<p className="text-sm text-muted-foreground">
										Switch plan tier (same seats, prorated):
									</p>
									<Button
										type="button"
										variant="outline"
										className="capitalize"
										disabled={changePlan.isPending || planPreview.isPending}
										onClick={() => void openPlanPreview(alternatePlanId)}
									>
										{alternatePlanId.replace("_", " ")}
									</Button>
								</div>
							) : null}
							<Label htmlFor="ws-seat-count">Paid seats</Label>
							<div className="flex flex-wrap items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="size-9"
									disabled={seatCount <= minSeats || updateSeats.isPending}
									onClick={() => openSeatPreview(seatCount - 1)}
								>
									<MinusIcon className="size-4" />
								</Button>
								<Input
									id="ws-seat-count"
									type="number"
									min={minSeats}
									className="w-24 tabular-nums"
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
									className="size-9"
									disabled={updateSeats.isPending}
									onClick={() => openSeatPreview(seatCount + 1)}
								>
									<PlusIcon className="size-4" />
								</Button>
								{seatCount !== data.seatCount ? (
									<Button
										type="button"
										variant="primary"
										className="h-9"
										disabled={updateSeats.isPending}
										onClick={() => openSeatPreview(seatCount)}
									>
										Update seats
									</Button>
								) : null}
							</div>
							<p className="text-xs text-muted-foreground">
								Minimum {minSeats} seat{minSeats === 1 ? "" : "s"} (active
								members and pending invites).
							</p>
							<Button
								type="button"
								variant="outline"
								className="gap-2"
								disabled={portal.isPending}
								onClick={() => void openPortal()}
							>
								{portal.isPending ? "Opening…" : "Payment method & invoices"}
							</Button>
						</div>
					) : (
						<div className="space-y-4 border-t border-border pt-4">
							<p className="text-sm text-muted-foreground">
								Subscribe this workspace to Teams or Teams Pro. Pricing is per
								seat; pooled document quota scales with seat count.
							</p>
							<div className="flex flex-wrap gap-2">
								{(["teams", "teams_pro"] as const).map((id) => (
									<Button
										key={id}
										type="button"
										variant={planId === id ? "primary" : "outline"}
										className="capitalize"
										onClick={() => setPlanId(id)}
									>
										{id.replace("_", " ")}
									</Button>
								))}
							</div>
							<div className="flex flex-wrap gap-2">
								{(["monthly", "yearly"] as const).map((value) => (
									<Button
										key={value}
										type="button"
										variant={interval === value ? "primary" : "outline"}
										className="capitalize"
										onClick={() => setInterval(value)}
									>
										{value}
									</Button>
								))}
							</div>
							<div className="space-y-2">
								<Label htmlFor="ws-checkout-seats">Seats to purchase</Label>
								<Input
									id="ws-checkout-seats"
									type="number"
									min={minSeats}
									className="w-32 tabular-nums"
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
							</div>
							<Button
								type="button"
								variant="primary"
								disabled={checkout.isPending || hasPaidPlan}
								onClick={() => void startCheckout()}
							>
								{checkout.isPending
									? "Preparing checkout…"
									: "Subscribe workspace"}
							</Button>
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
						? `Switch from ${planPreview.data.currentPlanId?.replace("_", " ") ?? data?.planId} to ${planPreview.data.planId?.replace("_", " ")}.`
						: "Preview unavailable"
				}
				preview={planPreview}
				onConfirm={confirmPlanChange}
				isConfirming={changePlan.isPending}
			/>
		</section>
	);
}
