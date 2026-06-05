import { throwAppError } from "@filosign/errors/server";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { invalidateOrgEntitlements } from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import type { BillingInterval } from "../billing";
import {
	countOrgUsedSeats,
	type OrgCheckoutPlanId,
	resolveOrgProductId,
} from "./org";
import {
	createDodoClient,
	isWorkspaceBillingPlanId,
	requireDodoApiKey,
} from "./policy";

function createBillingDodoClient() {
	requireDodoApiKey();
	return createDodoClient({ includeWebhookKey: false });
}

async function loadOrgSubscription(organizationId: string) {
	const [sub] = await db
		.select()
		.from(organizationSubscriptions)
		.where(eq(organizationSubscriptions.organizationId, organizationId))
		.limit(1);
	return sub ?? null;
}

async function requireActiveOrgSubscription(organizationId: string) {
	const sub = await loadOrgSubscription(organizationId);
	if (!sub?.dodoSubscriptionId) {
		throwAppError("BILLING.WORKSPACE_NO_SUBSCRIPTION");
	}
	if (!isWorkspaceBillingPlanId(sub.planId)) {
		throwAppError("BILLING.WORKSPACE_NOT_PAID_PLAN");
	}
	if (!sub.billingInterval) {
		throwAppError("BILLING.WORKSPACE_INTERVAL_UNKNOWN");
	}
	return sub;
}

type PlanChangePreview = {
	immediate_charge: {
		effective_at: string;
		summary: { total_amount: number; currency: string };
	};
	new_plan: { quantity: number };
};

async function previewOrgPlanChangeInternal(args: {
	subscriptionId: string;
	productId: string;
	quantity: number;
}) {
	const client = createBillingDodoClient();
	try {
		return (await client.subscriptions.previewChangePlan(args.subscriptionId, {
			product_id: args.productId,
			quantity: args.quantity,
			proration_billing_mode: "prorated_immediately",
		})) as PlanChangePreview;
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to preview plan change",
			cause: error,
		});
	}
}

async function changeOrgPlanInternal(args: {
	subscriptionId: string;
	productId: string;
	quantity: number;
	onPaymentFailure?: "prevent_change" | "apply_change";
}) {
	const client = createBillingDodoClient();
	try {
		await client.subscriptions.changePlan(args.subscriptionId, {
			product_id: args.productId,
			quantity: args.quantity,
			proration_billing_mode: "prorated_immediately",
			on_payment_failure: args.onPaymentFailure ?? "prevent_change",
		});
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to change workspace plan",
			cause: error,
		});
	}
}

async function fetchDodoSubscriptionQuantity(
	subscriptionId: string,
): Promise<number> {
	const client = createBillingDodoClient();
	try {
		const sub = (await client.subscriptions.retrieve(subscriptionId)) as {
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
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to fetch subscription from Dodo",
			cause: error,
		});
	}
	throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
		message: "Dodo subscription quantity is missing or invalid",
	});
}

async function fetchDodoSubscriptionQuantityWithRetry(args: {
	subscriptionId: string;
	expectedQuantity: number;
}) {
	const delaysMs = [0, 400, 800];
	for (const delayMs of delaysMs) {
		if (delayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
		const quantity = await fetchDodoSubscriptionQuantity(args.subscriptionId);
		if (quantity === args.expectedQuantity) return quantity;
	}
	return fetchDodoSubscriptionQuantity(args.subscriptionId);
}

async function syncOrgSeatCountInDb(organizationId: string, seatCount: number) {
	await db
		.update(organizationSubscriptions)
		.set({ seatCount, updatedAt: new Date() })
		.where(eq(organizationSubscriptions.organizationId, organizationId));
	await invalidateOrgEntitlements(organizationId);
}

function formatPlanChangePreview(
	preview: PlanChangePreview,
	args: {
		seatCount: number;
		currentSeatCount: number;
		targetPlanId: OrgCheckoutPlanId;
		currentPlanId: OrgCheckoutPlanId;
	},
) {
	const immediateChargeCents = preview.immediate_charge.summary.total_amount;
	const deltaSeatCount = args.seatCount - args.currentSeatCount;
	return {
		planId: args.targetPlanId,
		currentPlanId: args.currentPlanId,
		seatCount: args.seatCount,
		currentSeatCount: args.currentSeatCount,
		deltaSeatCount,
		isCredit: immediateChargeCents <= 0,
		effectiveAt: preview.immediate_charge.effective_at,
		immediateChargeCents,
		currency: preview.immediate_charge.summary.currency,
	};
}

function assertMinSeatCount(seatCount: number, usedSeats: number) {
	if (!Number.isInteger(seatCount) || seatCount < 1) {
		throwAppError("BILLING.SEAT_COUNT_INVALID");
	}
	if (seatCount < usedSeats) {
		throwAppError("BILLING.SEAT_COUNT_BELOW_USAGE", { params: { usedSeats } });
	}
}

export async function previewOrgSeatChange(args: {
	organizationId: string;
	seatCount: number;
}) {
	const sub = await requireActiveOrgSubscription(args.organizationId);
	const usedSeats = await countOrgUsedSeats(args.organizationId);
	assertMinSeatCount(args.seatCount, usedSeats);

	const dodoQuantity = await fetchDodoSubscriptionQuantity(
		sub.dodoSubscriptionId as string,
	);
	if (args.seatCount === dodoQuantity) {
		throwAppError("BILLING.SEAT_COUNT_ALREADY_ON_TARGET");
	}

	const productId = resolveOrgProductId(
		sub.planId as OrgCheckoutPlanId,
		sub.billingInterval as BillingInterval,
	);

	const preview = await previewOrgPlanChangeInternal({
		subscriptionId: sub.dodoSubscriptionId as string,
		productId,
		quantity: args.seatCount,
	});

	return formatPlanChangePreview(preview, {
		seatCount: args.seatCount,
		currentSeatCount: dodoQuantity,
		targetPlanId: sub.planId as OrgCheckoutPlanId,
		currentPlanId: sub.planId as OrgCheckoutPlanId,
	});
}

export async function updateOrgSeats(args: {
	organizationId: string;
	seatCount: number;
}) {
	const sub = await requireActiveOrgSubscription(args.organizationId);
	const usedSeats = await countOrgUsedSeats(args.organizationId);
	assertMinSeatCount(args.seatCount, usedSeats);

	const dodoQuantity = await fetchDodoSubscriptionQuantity(
		sub.dodoSubscriptionId as string,
	);

	if (args.seatCount === dodoQuantity) {
		if (sub.seatCount !== dodoQuantity) {
			await syncOrgSeatCountInDb(args.organizationId, dodoQuantity);
		}
		return { seatCount: dodoQuantity, changed: false, pendingPayment: false };
	}

	const productId = resolveOrgProductId(
		sub.planId as OrgCheckoutPlanId,
		sub.billingInterval as BillingInterval,
	);
	const isIncrease = args.seatCount > dodoQuantity;

	await changeOrgPlanInternal({
		subscriptionId: sub.dodoSubscriptionId as string,
		productId,
		quantity: args.seatCount,
		onPaymentFailure: isIncrease ? "prevent_change" : "apply_change",
	});

	const updatedQuantity = await fetchDodoSubscriptionQuantityWithRetry({
		subscriptionId: sub.dodoSubscriptionId as string,
		expectedQuantity: args.seatCount,
	});

	if (updatedQuantity === args.seatCount) {
		await syncOrgSeatCountInDb(args.organizationId, updatedQuantity);
		return {
			seatCount: updatedQuantity,
			changed: true,
			pendingPayment: false,
		};
	}

	if (sub.seatCount !== updatedQuantity) {
		await syncOrgSeatCountInDb(args.organizationId, updatedQuantity);
	}

	return {
		seatCount: updatedQuantity,
		changed: false,
		pendingPayment: isIncrease,
	};
}

export async function previewOrgPlanChange(args: {
	organizationId: string;
	planId: OrgCheckoutPlanId;
}) {
	const sub = await requireActiveOrgSubscription(args.organizationId);
	if (sub.planId === args.planId) {
		throwAppError("BILLING.WORKSPACE_ALREADY_ON_PLAN");
	}

	const dodoQuantity = await fetchDodoSubscriptionQuantity(
		sub.dodoSubscriptionId as string,
	);

	const productId = resolveOrgProductId(
		args.planId,
		sub.billingInterval as BillingInterval,
	);
	const preview = await previewOrgPlanChangeInternal({
		subscriptionId: sub.dodoSubscriptionId as string,
		productId,
		quantity: dodoQuantity,
	});

	return formatPlanChangePreview(preview, {
		seatCount: dodoQuantity,
		currentSeatCount: dodoQuantity,
		targetPlanId: args.planId,
		currentPlanId: sub.planId as OrgCheckoutPlanId,
	});
}

export async function changeOrgPlan(args: {
	organizationId: string;
	planId: OrgCheckoutPlanId;
}) {
	const sub = await requireActiveOrgSubscription(args.organizationId);
	if (sub.planId === args.planId) {
		return { planId: sub.planId, seatCount: sub.seatCount, changed: false };
	}

	const dodoQuantity = await fetchDodoSubscriptionQuantity(
		sub.dodoSubscriptionId as string,
	);

	const productId = resolveOrgProductId(
		args.planId,
		sub.billingInterval as BillingInterval,
	);

	await changeOrgPlanInternal({
		subscriptionId: sub.dodoSubscriptionId as string,
		productId,
		quantity: dodoQuantity,
	});

	const nextSeatCount = args.planId === "individual" ? 1 : dodoQuantity;

	await db
		.update(organizationSubscriptions)
		.set({
			planId: args.planId,
			seatCount: nextSeatCount,
			updatedAt: new Date(),
		})
		.where(eq(organizationSubscriptions.organizationId, args.organizationId));

	await invalidateOrgEntitlements(args.organizationId);

	return { planId: args.planId, seatCount: nextSeatCount, changed: true };
}
