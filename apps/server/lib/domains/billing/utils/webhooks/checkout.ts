import type { PlanId } from "@filosign/entitlements";
import type { PaidCheckoutPlanId } from "@filosign/shared";
import { isPaidCheckoutPlanId } from "@filosign/shared";
import { and, eq } from "drizzle-orm";
import { checkoutPlanLabel } from "@/lib/domains/billing/checkout-intents";
import {
	NEW_WORKSPACE_CHECKOUT_KIND,
	syncNewWorkspacePendingFromWebhook,
} from "@/lib/domains/billing/utils/new-workspace-checkout";
import {
	type PlatformAccessTx,
	upsertPaidAccessPendingFromWebhook,
} from "@/lib/domains/platform-access";
import {
	checkoutIntents,
	platformAccessPending,
} from "@/lib/platform/db/schema/platform-access";
import { getClientUrl } from "@/lib/platform/email";
import { logger } from "@/lib/platform/pino";
import { resolveIntervalFromProductId } from "../policy";

function extractSeatCountFromMetadata(
	metadata: Record<string, unknown> | undefined,
): number | null {
	const raw = metadata?.filosign_seat_count;
	if (typeof raw === "number" && Number.isInteger(raw) && raw >= 1) {
		return raw;
	}
	if (typeof raw === "string") {
		const parsed = Number.parseInt(raw, 10);
		if (Number.isInteger(parsed) && parsed >= 1) {
			return parsed;
		}
	}
	return null;
}

function extractIntervalFromMetadata(
	metadata: Record<string, unknown> | undefined,
): "monthly" | "yearly" | null {
	const interval = metadata?.filosign_interval;
	return interval === "monthly" || interval === "yearly" ? interval : null;
}

export function resolveCheckoutFirstSeatCount(args: {
	metadata?: Record<string, unknown>;
	payloadQuantity?: number;
	intentSeatCount?: number;
}): number {
	const fromMetadata = extractSeatCountFromMetadata(args.metadata);
	if (fromMetadata) return fromMetadata;
	if (
		typeof args.payloadQuantity === "number" &&
		Number.isInteger(args.payloadQuantity) &&
		args.payloadQuantity >= 1
	) {
		return args.payloadQuantity;
	}
	if (
		typeof args.intentSeatCount === "number" &&
		Number.isInteger(args.intentSeatCount) &&
		args.intentSeatCount >= 1
	) {
		return args.intentSeatCount;
	}
	return 1;
}

export function resolveCheckoutFirstBillingInterval(args: {
	metadata?: Record<string, unknown>;
	productId?: string;
	intentInterval?: "monthly" | "yearly" | null;
}): "monthly" | "yearly" | null {
	return (
		extractIntervalFromMetadata(args.metadata) ??
		args.intentInterval ??
		resolveIntervalFromProductId(args.productId)
	);
}

export async function isCheckoutFirstWithoutOrg(
	tx: PlatformAccessTx,
	args: {
		metadataSetupToken: string | null;
		metadataPendingId?: string | null;
		metadataCheckoutKind?: string | null;
		dodoSubscriptionId: string | null;
		organizationId: string | null;
	},
): Promise<boolean> {
	if (args.organizationId) return false;
	if (
		args.metadataCheckoutKind === NEW_WORKSPACE_CHECKOUT_KIND &&
		args.metadataPendingId
	) {
		const [pending] = await tx
			.select({ id: platformAccessPending.id })
			.from(platformAccessPending)
			.where(eq(platformAccessPending.id, args.metadataPendingId))
			.limit(1);
		return Boolean(pending);
	}
	if (args.metadataSetupToken) return true;
	if (!args.dodoSubscriptionId) return false;

	const [pending] = await tx
		.select({ id: platformAccessPending.id })
		.from(platformAccessPending)
		.where(
			and(
				eq(platformAccessPending.dodoSubscriptionId, args.dodoSubscriptionId),
				eq(platformAccessPending.status, "pending_wallet"),
			),
		)
		.limit(1);

	return Boolean(pending);
}

export async function prepareNewWorkspacePaidAccessInTx(
	tx: PlatformAccessTx,
	args: {
		eventType: string;
		pendingId: string;
		dodoSubscriptionId: string | null;
		dodoCustomerId: string | null;
		metadataPlanId: PlanId | null;
		mappedPlan: PlanId | null;
		metadata?: Record<string, unknown>;
		productId?: string;
		payloadQuantity?: number;
	},
): Promise<boolean> {
	if (args.eventType !== "subscription.active") return false;

	const planId = args.metadataPlanId ?? args.mappedPlan;
	if (!planId || planId === "free" || planId === "enterprise") {
		logger.error(
			{ pendingId: args.pendingId, planId },
			"new-workspace webhook missing plan id",
		);
		return false;
	}

	if (!isPaidCheckoutPlanId(planId)) {
		logger.error(
			{ pendingId: args.pendingId, planId },
			"new-workspace webhook unsupported plan id",
		);
		return false;
	}

	if (!args.dodoSubscriptionId) {
		logger.error(
			{ pendingId: args.pendingId },
			"new-workspace webhook missing subscription id",
		);
		return false;
	}

	const seatCount = resolveCheckoutFirstSeatCount({
		metadata: args.metadata,
		payloadQuantity: args.payloadQuantity,
	});
	const billingInterval = resolveCheckoutFirstBillingInterval({
		metadata: args.metadata,
		productId: args.productId,
	});

	return syncNewWorkspacePendingFromWebhook(tx, {
		pendingId: args.pendingId,
		dodoSubscriptionId: args.dodoSubscriptionId,
		dodoCustomerId: args.dodoCustomerId,
		planId,
		seatCount,
		billingInterval,
	});
}

export async function prepareCheckoutFirstPaidAccessInTx(
	tx: PlatformAccessTx,
	args: {
		eventType: string;
		setupToken: string | null;
		checkoutIntentId: string | null;
		dodoSubscriptionId: string | null;
		dodoCustomerId: string | null;
		metadataPlanId: PlanId | null;
		mappedPlan: PlanId | null;
		customerEmail: string | null;
		metadata?: Record<string, unknown>;
		productId?: string;
		payloadQuantity?: number;
	},
): Promise<{
	to: string;
	setupUrl: string;
	planLabel: string;
	planId: PaidCheckoutPlanId;
} | null> {
	if (args.eventType !== "subscription.active") return null;

	const planId = args.metadataPlanId ?? args.mappedPlan;
	if (!planId || planId === "free" || planId === "enterprise") {
		logger.error(
			{ setupToken: args.setupToken, planId },
			"checkout-first webhook missing plan id",
		);
		return null;
	}

	if (!isPaidCheckoutPlanId(planId)) {
		logger.error(
			{ setupToken: args.setupToken, planId },
			"checkout-first webhook unsupported plan id",
		);
		return null;
	}

	let intentSeatCount: number | undefined;
	let intentInterval: "monthly" | "yearly" | null | undefined;
	let email = args.customerEmail?.trim().toLowerCase() ?? null;
	if (args.checkoutIntentId) {
		const [intent] = await tx
			.select({
				email: checkoutIntents.email,
				seatCount: checkoutIntents.seatCount,
				billingInterval: checkoutIntents.billingInterval,
				setupToken: checkoutIntents.setupToken,
			})
			.from(checkoutIntents)
			.where(eq(checkoutIntents.id, args.checkoutIntentId))
			.limit(1);
		if (intent) {
			email = email ?? intent.email?.trim().toLowerCase() ?? null;
			intentSeatCount = intent.seatCount;
			intentInterval = intent.billingInterval as "monthly" | "yearly";
		}
	}

	if (!email) {
		logger.error(
			{ setupToken: args.setupToken, checkoutIntentId: args.checkoutIntentId },
			"checkout-first webhook missing customer email",
		);
		return null;
	}

	if (!args.dodoSubscriptionId) {
		logger.error(
			{ setupToken: args.setupToken },
			"checkout-first webhook missing subscription id",
		);
		return null;
	}

	let setupToken = args.setupToken?.trim() ?? "";
	if (!setupToken) {
		const [pending] = await tx
			.select({ setupToken: platformAccessPending.setupToken })
			.from(platformAccessPending)
			.where(
				eq(platformAccessPending.dodoSubscriptionId, args.dodoSubscriptionId),
			)
			.limit(1);
		setupToken = pending?.setupToken ?? "";
	}
	if (!setupToken) {
		logger.error(
			{ dodoSubscriptionId: args.dodoSubscriptionId },
			"checkout-first webhook missing setup token",
		);
		return null;
	}

	const seatCount = resolveCheckoutFirstSeatCount({
		metadata: args.metadata,
		payloadQuantity: args.payloadQuantity,
		intentSeatCount,
	});
	const billingInterval = resolveCheckoutFirstBillingInterval({
		metadata: args.metadata,
		productId: args.productId,
		intentInterval,
	});

	const { created } = await upsertPaidAccessPendingFromWebhook(tx, {
		setupToken,
		email,
		planId,
		dodoSubscriptionId: args.dodoSubscriptionId,
		dodoCustomerId: args.dodoCustomerId,
		seatCount,
		billingInterval,
		checkoutIntentId: args.checkoutIntentId,
	});

	const setupUrl = `${getClientUrl()}/?setup=${encodeURIComponent(setupToken)}`;

	logger.info(
		{
			email,
			planId,
			dodoSubscriptionId: args.dodoSubscriptionId,
			created,
		},
		"checkout-first pending access upserted",
	);

	return {
		to: email,
		setupUrl,
		planLabel: checkoutPlanLabel(planId),
		planId,
	};
}
