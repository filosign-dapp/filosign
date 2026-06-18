import { getPlanName, PLAN_PRICING } from "@filosign/entitlements";
import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import type { UpgradePlanLimitReason } from "@filosign/react/billing";
import {
	useChangeOrgPlan,
	useCreateOrgCheckoutSession,
	useUpgradeOfferings,
} from "@filosign/react/billing";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useState } from "react";
import env from "@/src/env";
import { Button } from "@/src/lib/components/ui/button";
import { Dialog } from "@/src/lib/components/ui/dialog";
import {
	FeatureDialogActions,
	FeatureDialogBody,
	FeatureDialogClose,
	FeatureDialogContent,
	FeatureDialogHeader,
	FeatureDialogMedia,
	FeatureDialogPanel,
} from "@/src/lib/components/ui/feature-dialog";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { clientPublicCheckoutEnabled } from "@/src/lib/deployment";
import {
	BILLING_SETTINGS_PATH,
	billingSettingsReturnUrl,
} from "@/src/lib/domains/billing/settings-path";
import { PLAN_LIMIT_COPY } from "@/src/lib/domains/entitlements/plan-limit-copy";
import { upgradePlanLimitMedia } from "@/src/lib/domains/feature-dialog/images";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { cn } from "@/src/lib/utils/index";

export type { UpgradePlanLimitReason };

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
	const titleId = useId();
	const navigate = useNavigate();
	const captureAppEvent = useCaptureAppEvent();
	const offeringsQuery = useUpgradeOfferings(open ? reason : null);
	const orgCheckout = useCreateOrgCheckoutSession();
	const changePlan = useChangeOrgPlan();
	const publicCheckoutEnabled = clientPublicCheckoutEnabled();
	const copy = PLAN_LIMIT_COPY[reason];
	const media = upgradePlanLimitMedia(reason);

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

	useEffect(() => {
		if (!open) return;
		captureAppEvent(CLIENT_ANALYTICS_EVENTS.upgradePlanPromptShown, {
			reason,
		});
	}, [open, reason, captureAppEvent]);

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
			void navigate({ to: BILLING_SETTINGS_PATH });
			return;
		}
		if (
			selectedOffering.cta === "change_plan" &&
			selectedPlan &&
			selectedPlan !== "individual"
		) {
			try {
				await changePlan.mutateAsync(selectedPlan, suppressGlobalErrorToast());
				toastUser.success(TOASTS.billing.planChangeSubmittedShort);
				onOpenChange(false);
			} catch (err) {
				showAppErrorToast(err);
			}
			return;
		}

		if (!publicCheckoutEnabled && selectedOffering.cta === "checkout") {
			window.open(pricingHref(), "_blank", "noopener,noreferrer");
			return;
		}

		const returnUrl = billingSettingsReturnUrl(window.location.origin);
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
				return publicCheckoutEnabled ? "Upgrade now" : "Request access";
		}
	})();

	const primaryPending = orgCheckout.isPending || changePlan.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<FeatureDialogContent aria-labelledby={titleId}>
				<FeatureDialogMedia src={media.src} badge={media.badge} />

				<FeatureDialogPanel>
					<FeatureDialogClose disabled={primaryPending} />

					<FeatureDialogHeader
						title={copy.title}
						titleId={titleId}
						description={copy.description}
					/>

					<FeatureDialogBody className="overflow-y-auto">
						{offeringsQuery.isLoading ? (
							<p className="py-4 text-center text-sm text-muted-foreground">
								Loading upgrade options…
							</p>
						) : offeringsQuery.data?.noUpgradeMessage &&
							offerings.length === 0 ? (
							<p className="text-sm text-pretty text-muted-foreground">
								{offeringsQuery.data.noUpgradeMessage}
							</p>
						) : (
							<>
								<div className="mx-auto flex max-w-60 justify-center rounded-lg border border-border/60 bg-muted/40 p-1">
									{(["monthly", "yearly"] as const).map((value) => (
										<button
											key={value}
											type="button"
											onClick={() => setInterval(value)}
											className={cn(
												"flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition",
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
												"flex w-full select-none items-center justify-between rounded-xl border p-3.5 text-left transition",
												!offering.selectable
													? "cursor-not-allowed border-border/40 bg-muted/10 opacity-50"
													: selectedPlan === offering.planId
														? "border-primary bg-primary/5 ring-1 ring-primary"
														: "border-border/60 hover:border-border hover:bg-muted/10",
											)}
										>
											<div className="min-w-0 pr-2">
												<div className="flex items-center gap-1.5">
													<span className="text-sm font-semibold text-foreground">
														{getPlanName(offering.planId)}
													</span>
												</div>
												<span className="mt-0.5 block text-xs text-muted-foreground">
													{offering.blockedReason ??
														(offering.planId === "individual"
															? "Billed on this workspace"
															: "Billed per workspace seat")}
												</span>
											</div>
											<span className="shrink-0 text-sm font-bold tabular-nums">
												${getPrice(offering.planId)}/mo
											</span>
										</button>
									))}
								</div>

								{selectedPlan && selectedPlan !== "individual" ? (
									<div className="space-y-2 rounded-xl border border-border/40 bg-muted/10 p-4">
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
											className="h-9 w-20"
										/>
									</div>
								) : null}
							</>
						)}

						<a
							href={pricingHref()}
							target="_blank"
							rel="noopener noreferrer"
							className="block text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
						>
							Compare all plans
						</a>

						<FeatureDialogActions>
							<Button
								type="button"
								variant="primary"
								size="lg"
								className="w-full gap-1.5"
								disabled={
									offeringsQuery.isLoading ||
									(!selectedOffering?.selectable && offerings.length > 0) ||
									primaryPending
								}
								isLoading={primaryPending}
								onClick={() => void handlePrimary()}
							>
								{primaryPending ? "Working…" : primaryLabel}
								{publicCheckoutEnabled &&
								selectedOffering?.cta === "checkout" ? (
									<ArrowSquareOutIcon
										className="size-4"
										weight="bold"
										aria-hidden
									/>
								) : null}
							</Button>
							<Button
								type="button"
								variant="outline"
								size="lg"
								className="w-full"
								onClick={() => onOpenChange(false)}
								disabled={primaryPending}
							>
								Close
							</Button>
						</FeatureDialogActions>
					</FeatureDialogBody>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}
