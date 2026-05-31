import type { PlanId } from "@filosign/entitlements";
import type { SubscriptionStatus } from "@/lib/platform/db/schema/billing";
import {
	allowsMissingProductId,
	isImmediateCancellation,
	isScheduledCancellation,
	isWorkspaceBillingPlanId,
	shouldDowngradeToFree,
} from "./policy";

export type WebhookPayloadData = {
	status?: string;
	product_id?: string;
	quantity?: number;
	cancel_at_next_billing_date?: boolean;
};

export type WebhookSyncPlanResult = {
	planId: PlanId;
	seatCount?: number;
	requireQuantity: boolean;
};

export function mapDodoSubscriptionStatus(
	status: string | undefined,
	eventType: string,
	cancelAtNextBillingDate: boolean,
): SubscriptionStatus {
	if (isScheduledCancellation({ eventType, cancelAtNextBillingDate })) {
		return "active";
	}
	if (isImmediateCancellation({ eventType, cancelAtNextBillingDate })) {
		return "canceled";
	}
	if (shouldDowngradeToFree(eventType)) {
		return "canceled";
	}

	switch (status) {
		case "active":
			return "active";
		case "on_hold":
			return "past_due";
		case "failed":
		case "pending":
			return "incomplete";
		case "cancelled":
		case "expired":
			return "canceled";
		default:
			return "incomplete";
	}
}

export function resolveWebhookUserPlanId(args: {
	eventType: string;
	mappedPlan: PlanId | null;
	cancelAtNextBillingDate: boolean;
	existingPlanId?: PlanId;
}): "free" | "individual" {
	if (shouldDowngradeToFree(args.eventType)) return "free";
	if (
		isImmediateCancellation({
			eventType: args.eventType,
			cancelAtNextBillingDate: args.cancelAtNextBillingDate,
		})
	) {
		return "free";
	}
	if (
		isScheduledCancellation({
			eventType: args.eventType,
			cancelAtNextBillingDate: args.cancelAtNextBillingDate,
		})
	) {
		const kept =
			args.mappedPlan === "individual"
				? "individual"
				: args.existingPlanId === "individual"
					? "individual"
					: "free";
		return kept;
	}
	if (args.mappedPlan === "individual") return "individual";
	return "free";
}

export function resolveWebhookOrgSync(args: {
	eventType: string;
	mappedPlan: PlanId | null;
	cancelAtNextBillingDate: boolean;
	quantity: number | undefined;
	existingPlanId?: PlanId;
	existingSeatCount?: number;
}): WebhookSyncPlanResult {
	if (shouldDowngradeToFree(args.eventType)) {
		return { planId: "free", seatCount: 1, requireQuantity: false };
	}

	if (
		isImmediateCancellation({
			eventType: args.eventType,
			cancelAtNextBillingDate: args.cancelAtNextBillingDate,
		})
	) {
		return { planId: "free", seatCount: 1, requireQuantity: false };
	}

	if (
		isScheduledCancellation({
			eventType: args.eventType,
			cancelAtNextBillingDate: args.cancelAtNextBillingDate,
		})
	) {
		const planId =
			args.mappedPlan && isWorkspaceBillingPlanId(args.mappedPlan)
				? args.mappedPlan
				: args.existingPlanId &&
						isWorkspaceBillingPlanId(args.existingPlanId as string)
					? args.existingPlanId
					: "free";
		return {
			planId,
			seatCount:
				planId === "individual"
					? 1
					: (args.existingSeatCount ?? args.quantity ?? 1),
			requireQuantity: false,
		};
	}

	if (!args.mappedPlan || !isWorkspaceBillingPlanId(args.mappedPlan)) {
		throw new Error("Unable to resolve org plan for webhook");
	}

	const seatCount = args.mappedPlan === "individual" ? 1 : args.quantity;

	return {
		planId: args.mappedPlan,
		seatCount,
		requireQuantity: args.mappedPlan !== "individual",
	};
}

export function webhookAllowsMissingProductId(eventType: string) {
	return allowsMissingProductId(eventType);
}
