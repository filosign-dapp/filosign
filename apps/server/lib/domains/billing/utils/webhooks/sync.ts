import type { PlanId } from "@filosign/entitlements";
import { eq } from "drizzle-orm";
import type db from "@/lib/platform/db";
import {
	type SubscriptionStatus,
	userSubscriptions,
} from "@/lib/platform/db/schema/billing";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import { logger } from "@/lib/platform/pino";
import {
	allowsMissingProductId,
	createDodoClient,
	isImmediateCancellation,
	isScheduledCancellation,
	isWorkspaceBillingPlanId,
	shouldDowngradeToFree,
} from "../policy";
import { parseOptionalDate } from "./index";

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

type DodoWebhookEvent = {
	type?: string;
	event_type?: string;
	data?: {
		subscription_id?: string;
		status?: string;
		product_id?: string;
		quantity?: number;
		customer_id?: string;
		customer?: {
			customer_id?: string;
			email?: string;
		};
		metadata?: Record<string, unknown>;
		next_billing_date?: string;
		previous_billing_date?: string;
		cancel_at_next_billing_date?: boolean;
	};
};

export async function resolveSubscriptionQuantity(args: {
	subscriptionId: string | null;
	payloadQuantity: number | undefined;
	required: boolean;
}): Promise<number | undefined> {
	if (
		typeof args.payloadQuantity === "number" &&
		Number.isInteger(args.payloadQuantity) &&
		args.payloadQuantity >= 1
	) {
		return args.payloadQuantity;
	}
	if (!args.subscriptionId) {
		if (args.required) {
			throw new Error("Subscription quantity missing and no subscription id");
		}
		return undefined;
	}

	const client = createDodoClient({ includeWebhookKey: false });
	try {
		const sub = (await client.subscriptions.retrieve(args.subscriptionId)) as {
			quantity?: number;
		};
		if (
			typeof sub.quantity === "number" &&
			Number.isInteger(sub.quantity) &&
			sub.quantity >= 1
		) {
			return sub.quantity;
		}
	} catch (error) {
		logger.warn(
			{ subscriptionId: args.subscriptionId, error },
			"failed to fetch dodo subscription quantity",
		);
	}

	if (args.required) {
		throw new Error("Unable to resolve subscription quantity");
	}
	return undefined;
}

export async function syncUserSubscription(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	args: {
		walletAddress: `0x${string}`;
		planId: "free" | "individual";
		status: SubscriptionStatus;
		payloadData: NonNullable<DodoWebhookEvent["data"]>;
		dodoCustomerId: string | null;
		dodoSubscriptionId: string | null;
	},
) {
	await tx
		.insert(userSubscriptions)
		.values({
			walletAddress: args.walletAddress,
			provider: "dodo",
			planId: args.planId,
			status: args.status,
			periodStart:
				parseOptionalDate(args.payloadData.previous_billing_date) ?? new Date(),
			periodEnd: parseOptionalDate(args.payloadData.next_billing_date),
			cancelAtPeriodEnd: Boolean(args.payloadData.cancel_at_next_billing_date),
			dodoCustomerId: args.dodoCustomerId ?? undefined,
			dodoSubscriptionId: args.dodoSubscriptionId ?? undefined,
		})
		.onConflictDoUpdate({
			target: userSubscriptions.walletAddress,
			set: {
				provider: "dodo",
				planId: args.planId,
				status: args.status,
				periodStart:
					parseOptionalDate(args.payloadData.previous_billing_date) ??
					undefined,
				periodEnd: parseOptionalDate(args.payloadData.next_billing_date),
				cancelAtPeriodEnd: Boolean(
					args.payloadData.cancel_at_next_billing_date,
				),
				dodoCustomerId: args.dodoCustomerId ?? undefined,
				dodoSubscriptionId: args.dodoSubscriptionId ?? undefined,
				updatedAt: new Date(),
			},
		});
}

export async function syncOrgSubscription(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	args: {
		organizationId: string;
		planId: "free" | "individual" | "teams" | "teams_pro";
		seatCount: number;
		status: SubscriptionStatus;
		billingInterval: "monthly" | "yearly" | null;
		payloadData: NonNullable<DodoWebhookEvent["data"]>;
		dodoCustomerId: string | null;
		dodoSubscriptionId: string | null;
	},
) {
	await tx
		.update(organizationSubscriptions)
		.set({
			provider: "dodo",
			planId: args.planId,
			seatCount: args.seatCount,
			status: args.status,
			billingInterval: args.billingInterval ?? undefined,
			periodStart:
				parseOptionalDate(args.payloadData.previous_billing_date) ?? undefined,
			periodEnd: parseOptionalDate(args.payloadData.next_billing_date),
			cancelAtPeriodEnd: Boolean(args.payloadData.cancel_at_next_billing_date),
			dodoCustomerId: args.dodoCustomerId ?? undefined,
			dodoSubscriptionId: args.dodoSubscriptionId ?? undefined,
			updatedAt: new Date(),
		})
		.where(eq(organizationSubscriptions.organizationId, args.organizationId));
}
