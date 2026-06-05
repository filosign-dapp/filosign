import { getPlanName, PLAN_PRICING } from "@filosign/entitlements";
import type { UpgradePlanLimitReason } from "@filosign/react/billing";
import {
	useChangeOrgPlan,
	useCreateOrgCheckoutSession,
	useUpgradeOfferings,
} from "@filosign/react/billing";
import { ArrowSquareOutIcon, SparkleIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import env from "@/src/env";
import Logo from "@/src/lib/components/app/chrome/logo";
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
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { cn } from "@/src/lib/utils/index";

export type { UpgradePlanLimitReason };

const COPY: Record<
	UpgradePlanLimitReason,
	{ title: string; description: string }
> = {
	"documents.sent.monthly": {
		title: "Monthly document limit reached",
		description:
			"You've exhausted your document quota for this month. Upgrade to continue sending envelopes.",
	},
	"envelope.recipients.max": {
		title: "Recipient limit reached",
		description:
			"You've reached the maximum recipients per envelope on your current plan. Upgrade to add more recipients.",
	},
	"features.settlement.basic": {
		title: "USDC payouts need a paid plan",
		description:
			"Upgrade to Solo or higher, then request payout attachment access in Workspace settings. After Filosign approves, you can attach USDC payouts when signing finishes.",
	},
	"features.settlement.advanced": {
		title: "Advanced payouts need Teams Pro",
		description:
			"Split payments across people, set minimum signatures before pay, and edit payouts after send with Teams Pro or Enterprise.",
	},
	"features.routing.advanced": {
		title: "Advanced signing order needs Teams Pro",
		description:
			"Set turn order (sequential or parallel) and minimum signatures (quorum) with Teams Pro or Enterprise.",
	},
	"features.shared_templates": {
		title: "Templates require Teams plan",
		description:
			"Create and reuse shared document templates with your team. Upgrade to Teams or Teams Pro to build templates.",
	},
	"features.supplementary_attachments": {
		title: "Supplementary files need Teams+",
		description:
			"Send encrypted extra files with your envelope on Teams or higher.",
	},
	"features.supplementary_attachments.recipient_select": {
		title: "Choose who gets supplementary files",
		description:
			"Pick which recipients receive each supplementary packet with Teams Pro or Enterprise.",
	},
	"features.supplementary_attachments.conditional_release": {
		title: "Conditional file unlock needs Teams Pro",
		description:
			"Release supplementary files only when signing conditions are met with Teams Pro or Enterprise.",
	},
};

function pricingHref(): string {
	return `${env.VITE_ASTRO_URL.replace(/\/$/, "")}/pricing`;
}

type CheckoutPlanId = "individual" | "teams" | "teams_pro";

export type UpgradePlanDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	reason: UpgradePlanLimitReason;
};

export function UpgradePlanDialog({
	open,
	onOpenChange,
	reason,
}: UpgradePlanDialogProps) {
	const navigate = useNavigate();
	const offeringsQuery = useUpgradeOfferings(open ? reason : null);
	const orgCheckout = useCreateOrgCheckoutSession();
	const changePlan = useChangeOrgPlan();
	const copy = COPY[reason];

	const offerings = offeringsQuery.data?.offerings ?? [];
	const recommendedId =
		offerings.find((o) => o.recommended && o.selectable)?.planId ??
		offerings.find((o) => o.selectable)?.planId ??
		null;

	const [selectedPlan, setSelectedPlan] = useState<CheckoutPlanId | null>(null);
	const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
	const [seatCount, setSeatCount] = useState(2);

	useEffect(() => {
		if (recommendedId) setSelectedPlan(recommendedId);
	}, [recommendedId]);

	const selectedOffering = useMemo(
		() => offerings.find((o) => o.planId === selectedPlan),
		[offerings, selectedPlan],
	);

	const getPrice = (planId: CheckoutPlanId) =>
		interval === "yearly"
			? PLAN_PRICING[planId].yearly
			: PLAN_PRICING[planId].monthly;

	const handlePrimary = async () => {
		if (!selectedOffering) return;

		if (selectedOffering.cta === "workspace_billing") {
			onOpenChange(false);
			void navigate({ to: "/dashboard/settings/workspace" });
			return;
		}
		if (
			selectedOffering.cta === "change_plan" &&
			selectedPlan &&
			selectedPlan !== "individual"
		) {
			try {
				await changePlan.mutateAsync(selectedPlan, suppressGlobalErrorToast());
				toast.success("Plan change submitted.");
				onOpenChange(false);
			} catch (err) {
				showAppErrorToast(err);
			}
			return;
		}

		const returnUrl = `${window.location.origin}/dashboard`;
		try {
			if (selectedPlan) {
				const result = await orgCheckout.mutateAsync(
					{
						planId: selectedPlan,
						interval,
						seatCount: selectedPlan === "individual" ? 1 : seatCount,
						returnUrl,
					},
					suppressGlobalErrorToast(),
				);
				window.location.href = result.checkoutUrl;
			}
		} catch (err) {
			showAppErrorToast(err);
		}
	};

	const primaryLabel = (() => {
		if (!selectedOffering?.selectable) return "View billing";
		switch (selectedOffering.cta) {
			case "workspace_billing":
				return "Workspace billing";
			case "change_plan":
				return "Switch plan";
			default:
				return "Upgrade now";
		}
	})();

	const planLabel = offeringsQuery.data?.effectivePlanId
		? getPlanName(offeringsQuery.data.effectivePlanId)
		: "Free";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="gap-0 overflow-hidden p-0 sm:max-w-lg"
				showCloseButton
			>
				<div className="border-b border-border/60 bg-muted/20 px-6 py-5">
					<DialogHeader className="gap-3 space-y-0">
						<div className="flex items-center gap-3">
							<Logo iconOnly animatedLogo={false} noHref />
							<div className="min-w-0 space-y-1">
								<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
									Current plan: {planLabel}
								</p>
								<DialogTitle className="text-lg leading-snug">
									{copy.title}
								</DialogTitle>
							</div>
						</div>
						<DialogDescription className="text-sm leading-relaxed pt-1">
							{copy.description}
						</DialogDescription>
					</DialogHeader>
				</div>

				<div className="px-6 py-5 space-y-4">
					{offeringsQuery.isLoading ? (
						<p className="text-sm text-muted-foreground text-center py-4">
							Loading upgrade options…
						</p>
					) : offeringsQuery.data?.noUpgradeMessage &&
						offerings.length === 0 ? (
						<p className="text-sm text-pretty text-muted-foreground">
							{offeringsQuery.data.noUpgradeMessage}
						</p>
					) : (
						<>
							<div className="flex justify-center p-1 border border-border/60 bg-muted/40 rounded-lg max-w-[240px] mx-auto">
								{(["monthly", "yearly"] as const).map((value) => (
									<button
										key={value}
										type="button"
										onClick={() => setInterval(value)}
										className={cn(
											"flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition",
											interval === value
												? "bg-background text-foreground shadow-xs"
												: "text-muted-foreground hover:text-foreground",
										)}
									>
										{value === "yearly" ? "Yearly (-15%)" : "Monthly"}
									</button>
								))}
							</div>

							<div className="space-y-2">
								{offerings.map((offering) => (
									<button
										key={offering.planId}
										type="button"
										disabled={!offering.selectable}
										onClick={() =>
											offering.selectable && setSelectedPlan(offering.planId)
										}
										className={cn(
											"flex items-center justify-between p-3.5 rounded-xl border text-left transition w-full select-none",
											!offering.selectable
												? "opacity-50 cursor-not-allowed bg-muted/10 border-border/40"
												: selectedPlan === offering.planId
													? "border-primary bg-primary/5 ring-1 ring-primary"
													: "border-border/60 hover:border-border hover:bg-muted/10",
										)}
									>
										<div className="min-w-0 pr-2">
											<div className="flex items-center gap-1.5">
												<span className="font-semibold text-sm text-foreground">
													{getPlanName(offering.planId)}
												</span>
												{offering.planId === "teams_pro" ? (
													<SparkleIcon
														className="size-3 text-warning"
														weight="fill"
														aria-hidden
													/>
												) : null}
											</div>
											<span className="text-xs text-muted-foreground block mt-0.5">
												{offering.blockedReason ??
													(offering.planId === "individual"
														? "Billed on this workspace"
														: "Billed per workspace seat")}
											</span>
										</div>
										<span className="font-bold text-sm shrink-0 tabular-nums">
											${getPrice(offering.planId)}/mo
										</span>
									</button>
								))}
							</div>

							{selectedPlan && selectedPlan !== "individual" ? (
								<div className="space-y-2 p-4 bg-muted/10 rounded-xl border border-border/40">
									<Label
										htmlFor="upgrade-seats"
										className="text-sm font-medium"
									>
										Workspace seats
									</Label>
									<Input
										id="upgrade-seats"
										type="number"
										min={1}
										max={100}
										value={seatCount}
										onChange={(e) =>
											setSeatCount(
												Math.max(1, Number.parseInt(e.target.value, 10) || 1),
											)
										}
										className="w-20 h-9"
									/>
								</div>
							) : null}
						</>
					)}
				</div>

				<DialogFooter className="border-t border-border/60 bg-muted/10 px-6 py-4 flex-col sm:flex-col gap-3">
					<div className="flex w-full flex-wrap justify-end gap-2">
						<a
							href={pricingHref()}
							target="_blank"
							rel="noopener noreferrer"
							className="mr-auto self-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
						>
							Compare all plans
						</a>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Close
						</Button>
						<Button
							type="button"
							variant="primary"
							className="gap-1.5"
							disabled={
								offeringsQuery.isLoading ||
								(!selectedOffering?.selectable && offerings.length > 0) ||
								orgCheckout.isPending ||
								changePlan.isPending
							}
							onClick={() => void handlePrimary()}
						>
							{orgCheckout.isPending || changePlan.isPending
								? "Working…"
								: primaryLabel}
							{selectedOffering?.cta === "checkout" ? (
								<ArrowSquareOutIcon
									className="size-4"
									weight="bold"
									aria-hidden
								/>
							) : null}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
