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
import { useEffect, useMemo, useRef, useState } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { clientPublicCheckoutEnabled } from "@/src/lib/deployment";
import { planDisplayName } from "@/src/lib/domains/billing/plan-seat-tiles";
import { billingSettingsReturnUrl } from "@/src/lib/domains/billing/settings-path";
import { useBillingSettings } from "@/src/lib/domains/billing/use-billing-settings";

type BillingInterval = "monthly" | "yearly";
type OrgPlanId = "individual" | "teams" | "teams_pro";

export function useSubscriptionSection() {
	const { activeMembership } = useBillingSettings();
	const summary = useOrgBillingSummary();
	const billingContext = useWorkspaceBillingContext();
	const checkout = useCreateOrgCheckoutSession();
	const updateSeats = useUpdateOrgSeats();
	const changePlan = useChangeOrgPlan();
	const portal = useCreateOrgPortalSession();
	const seatPreview = usePreviewOrgSeatChange();
	const planPreview = usePreviewOrgPlanChange();

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

	const data = summary.data;
	const minSeats = Math.max(1, data?.usedSeats ?? 1);
	const committedSeats = Math.max(data?.seatCount ?? seatCount, minSeats);
	const isSolo = data?.planId === "individual";
	const isTeamsPaid = data?.planId === "teams" || data?.planId === "teams_pro";
	const hasPaidPlan = isSolo || isTeamsPaid;

	const pricePerSeat = useMemo(
		() => getPlanPrice(planId, interval),
		[planId, interval],
	);
	const totalPrice = useMemo(
		() => pricePerSeat * seatCount,
		[pricePerSeat, seatCount],
	);
	const totalYearlyPrice = useMemo(
		() => getPlanYearlyTotal(planId) * seatCount,
		[planId, seatCount],
	);

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

	const returnUrl = billingSettingsReturnUrl(window.location.origin);
	const publicCheckoutEnabled = clientPublicCheckoutEnabled();

	const startCheckout = async () => {
		if (!publicCheckoutEnabled) return;
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
				toastUser.error(TOASTS.billing.paymentFailed.title, {
					hint: TOASTS.billing.paymentFailed.hint,
				});
				return;
			}
			if (!result.changed) {
				const seatsCopy = TOASTS.billing.alreadyOnSeats(result.seatCount);
				toastUser.info(seatsCopy.title);
				return;
			}
			setAwaitingSeatSync(true);
			toastUser.success(TOASTS.billing.seatChangeSubmitted.title, {
				hint: TOASTS.billing.seatChangeSubmitted.hint,
			});
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
			toastUser.success(TOASTS.billing.planChangeSubmitted.title, {
				hint: TOASTS.billing.planChangeSubmitted.hint,
			});
		} catch {}
	};

	const openPortal = async () => {
		try {
			const result = await portal.mutateAsync();
			window.open(result.url, "_blank", "noopener,noreferrer");
		} catch {}
	};

	return {
		canManage,
		summary,
		data,
		billingSyncPending,
		awaitingSeatSync,
		planId,
		setPlanId,
		interval,
		setInterval,
		seatCount,
		setSeatCount,
		seatPreviewOpen,
		setSeatPreviewOpen,
		planPreviewOpen,
		setPlanPreviewOpen,
		pendingPlanId,
		minSeats,
		committedSeats,
		isTeamsPaid,
		hasPaidPlan,
		pricePerSeat,
		totalPrice,
		totalYearlyPrice,
		seatControlsDisabled,
		allowed,
		alternatePlanId,
		canUpgradeSoloToTeams,
		publicCheckoutEnabled,
		checkout,
		updateSeats,
		changePlan,
		portal,
		seatPreview,
		planPreview,
		startCheckout,
		openSeatPreview,
		confirmSeatChange,
		openPlanPreview,
		confirmPlanChange,
		openPortal,
		planDisplayName,
	};
}
